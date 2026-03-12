using Microsoft.Extensions.Logging;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Application.Services;

public sealed class BleConnectionMonitor
{
    private static readonly TimeSpan DefaultRetryDelay = TimeSpan.FromSeconds(2);
    private const int DefaultMaxAttempts = 15;

    private readonly IProgressorService _progressorService;
    private readonly IConnectionNotifier _notifier;
    private readonly ILogger<BleConnectionMonitor> _logger;
    private readonly object _gate = new();
    private readonly TimeSpan _retryDelay;
    private readonly int _maxAttempts;

    private CancellationTokenSource? _reconnectionCts;
    private bool _ignoreNextDisconnect;

    public BleConnectionMonitor(
        IProgressorService progressorService,
        IConnectionNotifier notifier,
        ILogger<BleConnectionMonitor> logger)
        : this(progressorService, notifier, logger, DefaultRetryDelay, DefaultMaxAttempts)
    {
    }

    public BleConnectionMonitor(
        IProgressorService progressorService,
        IConnectionNotifier notifier,
        ILogger<BleConnectionMonitor> logger,
        TimeSpan retryDelay,
        int maxAttempts)
    {
        _progressorService = progressorService;
        _notifier = notifier;
        _logger = logger;
        _retryDelay = retryDelay;
        _maxAttempts = maxAttempts;

        _progressorService.ConnectionStatusChanged += OnConnectionStatusChanged;
    }

    public bool IsReconnecting { get; private set; }

    public event Action<DeviceStatusDto>? Reconnected;

    public event Action? ReconnectionFailed;

    public void PrepareIntentionalDisconnect()
    {
        lock (_gate)
        {
            _ignoreNextDisconnect = true;
            CancelReconnectionCore();
        }
    }

    public void CancelReconnection()
    {
        lock (_gate)
        {
            CancelReconnectionCore();
        }
    }

    private void OnConnectionStatusChanged(bool isConnected)
    {
        if (isConnected)
        {
            return;
        }

        lock (_gate)
        {
            if (_ignoreNextDisconnect)
            {
                _ignoreNextDisconnect = false;
                return;
            }

            if (IsReconnecting)
            {
                return;
            }

            IsReconnecting = true;
            _reconnectionCts = new CancellationTokenSource();
            var cancellationToken = _reconnectionCts.Token;
            _ = Task.Run(() => RunReconnectionLoopAsync(cancellationToken), CancellationToken.None);
        }
    }

    private async Task RunReconnectionLoopAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _notifier.SendConnectionLostAsync();

            for (var attempt = 1; attempt <= _maxAttempts; attempt++)
            {
                cancellationToken.ThrowIfCancellationRequested();

                try
                {
                    await _progressorService.ConnectAsync(cancellationToken);
                    await _progressorService.GetBatteryVoltageAsync(cancellationToken);
                    await _progressorService.GetFirmwareVersionAsync(cancellationToken);

                    var status = BuildDeviceStatus();
                    await _notifier.SendReconnectedAsync(status);
                    Reconnected?.Invoke(status);
                    return;
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    return;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "BLE reconnection attempt {Attempt} of {MaxAttempts} failed.", attempt, _maxAttempts);
                }

                if (attempt < _maxAttempts)
                {
                    await Task.Delay(_retryDelay, cancellationToken);
                }
            }

            await _notifier.SendReconnectionFailedAsync();
            ReconnectionFailed?.Invoke();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        finally
        {
            lock (_gate)
            {
                if (_reconnectionCts is not null && _reconnectionCts.Token == cancellationToken)
                {
                    _reconnectionCts.Dispose();
                    _reconnectionCts = null;
                    IsReconnecting = false;
                }
            }
        }
    }

    private DeviceStatusDto BuildDeviceStatus()
    {
        return new DeviceStatusDto(
            _progressorService.IsConnected,
            _progressorService.DeviceName,
            _progressorService.BatteryVoltage,
            _progressorService.FirmwareVersion);
    }

    private void CancelReconnectionCore()
    {
        _reconnectionCts?.Cancel();
    }
}
