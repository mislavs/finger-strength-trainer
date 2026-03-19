using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using TindeqTrainer.Domain.Services;
using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Application.Services;

public sealed class LiveStreamService
{
    private static readonly TimeSpan FlushInterval = TimeSpan.FromMilliseconds(25);

    private readonly IProgressorService _progressorService;
    private readonly ILiveStreamNotifier _notifier;
    private readonly ILogger<LiveStreamService> _logger;
    private readonly object _gate = new();
    private readonly ConcurrentQueue<ForceSample> _pendingSamples = new();
    private readonly SemaphoreSlim _flushLock = new(1, 1);
    private Timer? _flushTimer;

    private LiveStreamState _state = LiveStreamState.Idle;
    private DateTime _startedAtUtc;
    private DateTime _stoppedAtUtc;
    private double _peakForceKg;
    private double _totalForceKg;
    private int _sampleCount;
    private double _lastSampleTimestampSeconds;

    public bool IsStreaming
    {
        get
        {
            lock (_gate)
            {
                return _state is LiveStreamState.Streaming;
            }
        }
    }

    public LiveStreamService(
        IProgressorService progressorService,
        ILiveStreamNotifier notifier,
        BleConnectionMonitor connectionMonitor,
        ILogger<LiveStreamService> logger)
    {
        _progressorService = progressorService;
        _notifier = notifier;
        _logger = logger;

        connectionMonitor.Reconnected += OnReconnected;
        connectionMonitor.ReconnectionFailed += OnReconnectionFailed;
    }

    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            if (_state is not LiveStreamState.Idle)
            {
                throw new InvalidOperationException("Live stream can only start from the idle state.");
            }

            ResetToIdleState();
            _state = LiveStreamState.Streaming;
            _startedAtUtc = DateTime.UtcNow;
            _progressorService.SamplesReceived += OnSamplesReceived;
            _flushTimer = new Timer(OnFlushTimer, null, FlushInterval, FlushInterval);
        }

        try
        {
            await _progressorService.StartMeasurementAsync(cancellationToken);
        }
        catch
        {
            lock (_gate)
            {
                _progressorService.SamplesReceived -= OnSamplesReceived;
                _flushTimer?.Dispose();
                _flushTimer = null;
                ResetToIdleState();
            }

            throw;
        }
    }

    public async Task<LiveStreamStatsDto> StopAsync(CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            if (_state is not LiveStreamState.Streaming)
            {
                throw new InvalidOperationException("Live stream can only stop from the streaming state.");
            }

            _progressorService.SamplesReceived -= OnSamplesReceived;
            _flushTimer?.Dispose();
            _flushTimer = null;
        }

        try
        {
            await _progressorService.StopMeasurementAsync(cancellationToken);
        }
        catch
        {
            lock (_gate)
            {
                if (_state is LiveStreamState.Streaming)
                {
                    _progressorService.SamplesReceived += OnSamplesReceived;
                    _flushTimer = new Timer(OnFlushTimer, null, FlushInterval, FlushInterval);
                }
            }

            throw;
        }

        await FlushPendingSamplesAsync(allowWhenStopped: true);

        LiveStreamStatsDto stats;
        lock (_gate)
        {
            _stoppedAtUtc = DateTime.UtcNow;
            stats = BuildStatsCore();
            ResetToIdleState();
        }

        await _notifier.SendLiveStreamStoppedAsync(stats);
        return stats;
    }

    private void OnReconnected(DeviceStatusDto _status)
    {
        _ = ResumeAfterReconnectAsync();
    }

    private void OnReconnectionFailed()
    {
        _ = StopAfterReconnectionFailureAsync();
    }

    private async Task ResumeAfterReconnectAsync()
    {
        lock (_gate)
        {
            if (_state is not LiveStreamState.Streaming)
            {
                return;
            }

            _progressorService.SamplesReceived -= OnSamplesReceived;
            _progressorService.SamplesReceived += OnSamplesReceived;
        }

        try
        {
            await _progressorService.StartMeasurementAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to restart live stream measurement after BLE reconnection. Finalizing the partial recording.");
            await StopAfterReconnectionFailureAsync();
        }
    }

    private async Task StopAfterReconnectionFailureAsync()
    {
        lock (_gate)
        {
            if (_state is not LiveStreamState.Streaming)
            {
                return;
            }

            _progressorService.SamplesReceived -= OnSamplesReceived;
            _flushTimer?.Dispose();
            _flushTimer = null;
            _state = LiveStreamState.Stopped;
            _stoppedAtUtc = DateTime.UtcNow;
        }

        await FlushPendingSamplesAsync(allowWhenStopped: true);

        LiveStreamStatsDto stats;
        lock (_gate)
        {
            stats = BuildStatsCore();
            ResetToIdleState();
        }

        await _notifier.SendLiveStreamStoppedAsync(stats);
    }

    private async void OnFlushTimer(object? _)
    {
        await FlushPendingSamplesAsync();
    }

    private void OnSamplesReceived(ForceSample[] samples)
    {
        if (samples.Length == 0)
        {
            return;
        }

        lock (_gate)
        {
            if (_state is not LiveStreamState.Streaming)
            {
                return;
            }

            foreach (var sample in samples)
            {
                _pendingSamples.Enqueue(sample);
                _sampleCount++;
                _totalForceKg += sample.WeightKg;
                _peakForceKg = Math.Max(_peakForceKg, sample.WeightKg);
                _lastSampleTimestampSeconds = Math.Max(_lastSampleTimestampSeconds, sample.TimestampSeconds);
            }
        }
    }

    private async Task FlushPendingSamplesAsync(bool allowWhenStopped = false)
    {
        if (!await _flushLock.WaitAsync(0))
        {
            return;
        }

        try
        {
            if (!allowWhenStopped && _state is not LiveStreamState.Streaming)
            {
                return;
            }

            ForceSample? last = null;
            while (_pendingSamples.TryDequeue(out var sample))
                last = sample;

            if (last is not { } latest)
                return;

            await _notifier.SendForceSamplesAsync([latest]);
        }
        finally
        {
            _flushLock.Release();
        }
    }

    private LiveStreamStatsDto BuildStatsCore()
    {
        return new LiveStreamStatsDto(
            _peakForceKg,
            _sampleCount > 0 ? _totalForceKg / _sampleCount : 0d,
            GetDurationSeconds());
    }

    private double GetDurationSeconds()
    {
        if (_sampleCount > 0)
        {
            return _lastSampleTimestampSeconds;
        }

        if (_startedAtUtc == default)
        {
            return 0d;
        }

        var endUtc = _stoppedAtUtc == default ? DateTime.UtcNow : _stoppedAtUtc;
        return Math.Max(0d, (endUtc - _startedAtUtc).TotalSeconds);
    }

    private void ResetToIdleState()
    {
        _state = LiveStreamState.Idle;
        _startedAtUtc = default;
        _stoppedAtUtc = default;
        _peakForceKg = 0d;
        _totalForceKg = 0d;
        _sampleCount = 0;
        _lastSampleTimestampSeconds = 0d;

        while (_pendingSamples.TryDequeue(out _))
        {
        }
    }

    private enum LiveStreamState
    {
        Idle,
        Streaming,
        Stopped
    }
}
