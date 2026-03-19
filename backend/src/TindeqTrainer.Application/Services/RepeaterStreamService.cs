using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using TindeqTrainer.Domain.Services;
using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Application.Services;

public sealed class RepeaterStreamService
{
    private static readonly TimeSpan FlushInterval = TimeSpan.FromMilliseconds(25);

    private readonly IProgressorService _progressorService;
    private readonly ILiveStreamNotifier _notifier;
    private readonly ILogger<RepeaterStreamService> _logger;
    private readonly object _gate = new();
    private readonly ConcurrentQueue<ForceSample> _pendingSamples = new();
    private readonly SemaphoreSlim _flushLock = new(1, 1);
    private Timer? _flushTimer;
    private RepeaterStreamState _state = RepeaterStreamState.Idle;

    public RepeaterStreamService(
        IProgressorService progressorService,
        ILiveStreamNotifier notifier,
        ILogger<RepeaterStreamService> logger)
    {
        _progressorService = progressorService;
        _notifier = notifier;
        _logger = logger;
    }

    public bool IsStreaming
    {
        get
        {
            lock (_gate)
            {
                return _state is RepeaterStreamState.Streaming;
            }
        }
    }

    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            if (_state is not RepeaterStreamState.Idle)
            {
                throw new InvalidOperationException("Repeater stream can only start from the idle state.");
            }

            ResetToIdleState();
            _state = RepeaterStreamState.Streaming;
            _progressorService.SamplesReceived += OnSamplesReceived;
            _flushTimer = new Timer(OnFlushTimer, null, FlushInterval, FlushInterval);
        }

        try
        {
            await _progressorService.StartMeasurementAsync(cancellationToken);
            await _notifier.SendForceStreamStateChangedAsync(true);
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

    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            if (_state is not RepeaterStreamState.Streaming)
            {
                throw new InvalidOperationException("Repeater stream can only stop from the streaming state.");
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
                if (_state is RepeaterStreamState.Streaming)
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
            ResetToIdleState();
        }

        await _notifier.SendForceStreamStateChangedAsync(false);
    }

    private async void OnFlushTimer(object? _)
    {
        try
        {
            await FlushPendingSamplesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to flush repeater force samples.");
        }
    }

    private void OnSamplesReceived(ForceSample[] samples)
    {
        if (samples.Length == 0)
        {
            return;
        }

        lock (_gate)
        {
            if (_state is not RepeaterStreamState.Streaming)
            {
                return;
            }

            foreach (var sample in samples)
            {
                _pendingSamples.Enqueue(sample);
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
            if (!allowWhenStopped && !IsStreaming)
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

    private void ResetToIdleState()
    {
        _state = RepeaterStreamState.Idle;

        while (_pendingSamples.TryDequeue(out _))
        {
        }
    }

    private enum RepeaterStreamState
    {
        Idle,
        Streaming
    }
}
