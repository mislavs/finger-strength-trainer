using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Services;
using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Application.Tests.Services;

public sealed class RepeaterStreamServiceTests
{
    private readonly IProgressorService _progressorService;
    private readonly ILiveStreamNotifier _notifier;
    private readonly RepeaterStreamService _sut;

    public RepeaterStreamServiceTests()
    {
        _progressorService = Substitute.For<IProgressorService>();
        _notifier = Substitute.For<ILiveStreamNotifier>();
        _sut = new RepeaterStreamService(
            _progressorService,
            _notifier,
            NullLogger<RepeaterStreamService>.Instance);
    }

    [Fact]
    public async Task StartAsync_WhenIdle_StartsMeasurement()
    {
        var cancellationToken = TestContext.Current.CancellationToken;

        await _sut.StartAsync(cancellationToken);

        await _progressorService.DidNotReceive().TareAsync(Arg.Any<CancellationToken>());
        await _progressorService.Received(1).StartMeasurementAsync(cancellationToken);
        await _notifier.Received(1).SendForceStreamStateChangedAsync(true);
        _progressorService.Received(1).SamplesReceived += Arg.Any<Action<ForceSample[]>>();

        await _sut.StopAsync(cancellationToken);
    }

    [Fact]
    public async Task StartAsync_WhenAlreadyStreaming_ThrowsInvalidOperation()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);

        Func<Task> act = () => _sut.StartAsync(cancellationToken);

        await act.Should().ThrowAsync<InvalidOperationException>();
        await _sut.StopAsync(cancellationToken);
    }

    [Fact]
    public async Task StopAsync_WhenIdle_ThrowsInvalidOperation()
    {
        var cancellationToken = TestContext.Current.CancellationToken;

        Func<Task> act = () => _sut.StopAsync(cancellationToken);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task StopAsync_WhenStreaming_StopsMeasurementAndClearsStreamingState()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);

        await _sut.StopAsync(cancellationToken);

        await _progressorService.Received(1).StopMeasurementAsync(cancellationToken);
        await _notifier.Received(1).SendForceStreamStateChangedAsync(false);
        _progressorService.Received(1).SamplesReceived -= Arg.Any<Action<ForceSample[]>>();
        _sut.IsStreaming.Should().BeFalse();
    }

    [Fact]
    public async Task FlushTimer_WhenSamplesPending_SendsLastSample()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);
        var samples = new[]
        {
            new ForceSample(9f, 0.1),
            new ForceSample(12f, 0.2),
            new ForceSample(15f, 0.3),
        };

        _progressorService.SamplesReceived += Raise.Event<Action<ForceSample[]>>(samples);
        await Task.Delay(TimeSpan.FromMilliseconds(175), cancellationToken);

        await _notifier.Received().SendForceSamplesAsync(Arg.Is<ForceSample[]>(batch =>
            batch.Length == 1 &&
            Math.Abs(batch[0].WeightKg - 15f) < 0.001f &&
            Math.Abs(batch[0].TimestampSeconds - 0.3d) < 0.001d));

        await _sut.StopAsync(cancellationToken);
    }
}
