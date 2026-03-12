using TindeqTrainer.Domain.Services;
using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Infrastructure.Bluetooth;

public sealed class MockProgressorService : IProgressorService
{
    private static readonly TimeSpan ScanDelay = TimeSpan.FromMilliseconds(200);
    private static readonly TimeSpan SampleInterval = TimeSpan.FromMilliseconds(12.5);
    private static readonly TimeSpan FlushInterval = TimeSpan.FromMilliseconds(100);

    private readonly object _connectCancellationLock = new();
    private readonly SemaphoreSlim _stateLock = new(1, 1);
    private CancellationTokenSource? _connectCts;
    private CancellationTokenSource? _measurementCts;
    private Task? _measurementTask;
    private bool _disposed;

    public bool IsConnected { get; private set; }

    public string? DeviceName { get; private set; }

    public float? BatteryVoltage { get; private set; }

    public string? FirmwareVersion { get; private set; }

    public event Action<ForceSample[]>? SamplesReceived;

    public event Action<bool>? ConnectionStatusChanged;

    public async Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();

        await _stateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (IsConnected)
            {
                return;
            }

            using var connectCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            lock (_connectCancellationLock)
            {
                _connectCts = connectCts;
            }

            try
            {
                await Task.Delay(ScanDelay, connectCts.Token).ConfigureAwait(false);
                IsConnected = true;
                DeviceName = "Progressor-Mock";
                BatteryVoltage = 3.85f;
                FirmwareVersion = "2.3-mock";
                ConnectionStatusChanged?.Invoke(true);
            }
            finally
            {
                lock (_connectCancellationLock)
                {
                    if (ReferenceEquals(_connectCts, connectCts))
                    {
                        _connectCts = null;
                    }
                }
            }
        }
        finally
        {
            _stateLock.Release();
        }
    }

    public void CancelConnect()
    {
        CancellationTokenSource? connectCts;
        lock (_connectCancellationLock)
        {
            connectCts = _connectCts;
        }

        if (connectCts is null)
        {
            return;
        }

        try
        {
            connectCts.Cancel();
        }
        catch (ObjectDisposedException)
        {
            // Best effort cancellation while the connection CTS is being cleaned up.
        }
    }

    public async Task DisconnectAsync()
    {
        if (_disposed)
        {
            return;
        }

        await _stateLock.WaitAsync().ConfigureAwait(false);
        try
        {
            await StopMeasurementCoreAsync().ConfigureAwait(false);

            var wasConnected = IsConnected;
            IsConnected = false;
            DeviceName = null;
            BatteryVoltage = null;
            FirmwareVersion = null;

            if (wasConnected)
            {
                ConnectionStatusChanged?.Invoke(false);
            }
        }
        finally
        {
            _stateLock.Release();
        }
    }

    public async Task SimulateUnexpectedDisconnectAsync()
    {
        ThrowIfDisposed();

        await _stateLock.WaitAsync().ConfigureAwait(false);
        try
        {
            await StopMeasurementCoreAsync().ConfigureAwait(false);

            var wasConnected = IsConnected;
            IsConnected = false;
            DeviceName = null;
            BatteryVoltage = null;
            FirmwareVersion = null;

            if (wasConnected)
            {
                ConnectionStatusChanged?.Invoke(false);
            }
        }
        finally
        {
            _stateLock.Release();
        }
    }

    public Task TareAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureConnected();
        return Task.CompletedTask;
    }

    public async Task StartMeasurementAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();
        await _stateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            EnsureConnected();
            if (_measurementTask is not null)
            {
                return;
            }

            _measurementCts = new CancellationTokenSource();
            _measurementTask = RunMeasurementLoopAsync(_measurementCts.Token);
        }
        finally
        {
            _stateLock.Release();
        }
    }

    public async Task StopMeasurementAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        await _stateLock.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await StopMeasurementCoreAsync().ConfigureAwait(false);
        }
        finally
        {
            _stateLock.Release();
        }
    }

    public Task<float> GetBatteryVoltageAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureConnected();
        var voltage = BatteryVoltage ?? 3.85f;
        BatteryVoltage = voltage;
        return Task.FromResult(voltage);
    }

    public Task<string> GetFirmwareVersionAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureConnected();
        var version = FirmwareVersion ?? "2.3-mock";
        FirmwareVersion = version;
        return Task.FromResult(version);
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        await DisconnectAsync().ConfigureAwait(false);
        _disposed = true;
        _stateLock.Dispose();
        GC.SuppressFinalize(this);
    }

    private async Task StopMeasurementCoreAsync()
    {
        var measurementCts = _measurementCts;
        var measurementTask = _measurementTask;
        _measurementCts = null;
        _measurementTask = null;

        if (measurementCts is null)
        {
            return;
        }

        measurementCts.Cancel();
        measurementCts.Dispose();

        if (measurementTask is null)
        {
            return;
        }

        try
        {
            await measurementTask.ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            // Expected during cancellation.
        }
    }

    private async Task RunMeasurementLoopAsync(CancellationToken cancellationToken)
    {
        using var timer = new PeriodicTimer(SampleInterval);
        var measurementStopwatch = System.Diagnostics.Stopwatch.StartNew();
        var flushStopwatch = System.Diagnostics.Stopwatch.StartNew();
        var batch = new List<ForceSample>(8);

        try
        {
            while (await timer.WaitForNextTickAsync(cancellationToken).ConfigureAwait(false))
            {
                var elapsedSeconds = measurementStopwatch.Elapsed.TotalSeconds;
                var noise = (Random.Shared.NextDouble() - 0.5d) * 0.5d;
                var force = Math.Max(0d, 10d + (5d * Math.Sin(elapsedSeconds * 2d * Math.PI * 0.5d)) + noise);
                batch.Add(new ForceSample((float)force, elapsedSeconds));

                if (batch.Count >= 8 || flushStopwatch.Elapsed >= FlushInterval)
                {
                    SamplesReceived?.Invoke([.. batch]);
                    batch.Clear();
                    flushStopwatch.Restart();
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when stopping measurement.
        }
        finally
        {
            if (batch.Count > 0)
            {
                SamplesReceived?.Invoke([.. batch]);
            }
        }
    }

    private void ThrowIfDisposed()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
    }

    private void EnsureConnected()
    {
        if (!IsConnected)
        {
            throw new InvalidOperationException("Progressor is not connected.");
        }
    }
}
