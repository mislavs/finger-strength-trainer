using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TindeqTrainer.Domain.Entities;
using TindeqTrainer.Domain.Enums;
using TindeqTrainer.Domain.Services;
using TindeqTrainer.Domain.ValueObjects;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Services;

public sealed class LiveStreamService
{
    private static readonly TimeSpan FlushInterval = TimeSpan.FromMilliseconds(100);

    private readonly IProgressorService _progressorService;
    private readonly ILiveStreamNotifier _notifier;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<LiveStreamService> _logger;
    private readonly object _gate = new();
    private readonly ConcurrentQueue<ForceSample> _rawSamples = new();
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
        IServiceScopeFactory serviceScopeFactory,
        BleConnectionMonitor connectionMonitor,
        ILogger<LiveStreamService> logger)
    {
        _progressorService = progressorService;
        _notifier = notifier;
        _serviceScopeFactory = serviceScopeFactory;
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

        lock (_gate)
        {
            _state = LiveStreamState.Stopped;
            _stoppedAtUtc = DateTime.UtcNow;
        }

        var stats = BuildStats();
        await _notifier.SendLiveStreamStoppedAsync(stats);
        return stats;
    }

    public async Task<Guid> SaveAsync(CancellationToken cancellationToken = default)
    {
        LiveStreamRecord record;

        lock (_gate)
        {
            if (_state is not LiveStreamState.Stopped)
            {
                throw new InvalidOperationException("Live stream can only be saved from the stopped state.");
            }

            record = new LiveStreamRecord(
                Guid.NewGuid(),
                _startedAtUtc,
                _rawSamples.ToArray().ToList(),
                _peakForceKg,
                _sampleCount > 0 ? _totalForceKg / _sampleCount : 0d,
                TimeSpan.FromSeconds(GetDurationSeconds()));
        }

        using var scope = _serviceScopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var session = Session.Create(
            record.Date,
            SessionType.LiveStream,
            protocolId: null,
            protocolName: "Live Stream",
            isComplete: true,
            peakForceKg: record.PeakForceKg,
            avgForceKg: record.AvgForceKg,
            durationSeconds: record.Duration.TotalSeconds,
            id: record.Id);

        dbContext.Sessions.Add(session);

        if (record.Samples.Count > 0)
        {
            var sessionSamples = record.Samples
                .Select(sample => SessionSample.Create(
                    session.Id,
                    sample.WeightKg,
                    sample.TimestampSeconds))
                .ToList();

            dbContext.SessionSamples.AddRange(sessionSamples);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        lock (_gate)
        {
            ResetToIdleState();
        }

        return session.Id;
    }

    public void Discard()
    {
        lock (_gate)
        {
            if (_state is not LiveStreamState.Stopped)
            {
                throw new InvalidOperationException("Live stream can only be discarded from the stopped state.");
            }

            ResetToIdleState();
        }
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
        await _notifier.SendLiveStreamStoppedAsync(BuildStats());
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
                _rawSamples.Enqueue(sample);
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

            var count = 0;
            double summedWeight = 0;
            double latestTimestamp = 0;

            while (_pendingSamples.TryDequeue(out var sample))
            {
                count++;
                summedWeight += sample.WeightKg;
                latestTimestamp = sample.TimestampSeconds;
            }

            if (count == 0)
            {
                return;
            }

            var averagedSample = new ForceSample(
                (float)(summedWeight / count),
                latestTimestamp);

            await _notifier.SendForceSamplesAsync([averagedSample]);
        }
        finally
        {
            _flushLock.Release();
        }
    }

    private LiveStreamStatsDto BuildStats()
    {
        lock (_gate)
        {
            return new LiveStreamStatsDto(
                _peakForceKg,
                _sampleCount > 0 ? _totalForceKg / _sampleCount : 0d,
                GetDurationSeconds());
        }
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

        while (_rawSamples.TryDequeue(out _))
        {
        }

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
