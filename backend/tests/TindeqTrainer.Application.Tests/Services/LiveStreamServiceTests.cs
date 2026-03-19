using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Services;
using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Application.Tests.Services;

public sealed class LiveStreamServiceTests
{
    private readonly IProgressorService _progressorService;
    private readonly ILiveStreamNotifier _notifier;
    private readonly LiveStreamService _sut;

    public LiveStreamServiceTests()
    {
        _progressorService = Substitute.For<IProgressorService>();
        _notifier = Substitute.For<ILiveStreamNotifier>();

        var connectionNotifier = Substitute.For<IConnectionNotifier>();
        var connectionMonitor = new BleConnectionMonitor(
            _progressorService,
            connectionNotifier,
            NullLogger<BleConnectionMonitor>.Instance,
            TimeSpan.FromMilliseconds(5),
            3);

        _sut = new LiveStreamService(
            _progressorService,
            _notifier,
            connectionMonitor,
            NullLogger<LiveStreamService>.Instance);
    }

    [Fact]
    public async Task StartAsync_WhenIdle_StartsDeviceMeasurement()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;

        // Act
        await _sut.StartAsync(cancellationToken);

        // Assert
        await _progressorService.Received(1).StartMeasurementAsync(cancellationToken);
        _progressorService.Received(1).SamplesReceived += Arg.Any<Action<ForceSample[]>>();

        await _sut.StopAsync(cancellationToken);
    }

    [Fact]
    public async Task StartAsync_WhenAlreadyStreaming_ThrowsInvalidOperation()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);

        // Act
        Func<Task> act = () => _sut.StartAsync(cancellationToken);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>();

        await _sut.StopAsync(cancellationToken);
    }

    [Fact]
    public async Task StopAsync_WhenIdle_ThrowsInvalidOperation()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;

        // Act
        Func<Task> act = () => _sut.StopAsync(cancellationToken);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task StopAsync_WhenStreaming_ReturnsCorrectStats()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);
        var samples = new[]
        {
            new ForceSample(10f, 0.1),
            new ForceSample(14f, 0.2),
        };
        _progressorService.SamplesReceived += Raise.Event<Action<ForceSample[]>>(samples);

        // Act
        var result = await _sut.StopAsync(cancellationToken);

        // Assert
        result.PeakForceKg.Should().Be(14d);
        result.AvgForceKg.Should().Be(12d);
        result.DurationSeconds.Should().Be(0.2d);
        await _progressorService.Received(1).StopMeasurementAsync(cancellationToken);
        _progressorService.Received(1).SamplesReceived -= Arg.Any<Action<ForceSample[]>>();
        await _notifier.Received(1).SendLiveStreamStoppedAsync(Arg.Is<LiveStreamStatsDto>(stats =>
            stats.PeakForceKg == 14d &&
            stats.AvgForceKg == 12d &&
            stats.DurationSeconds == 0.2d));
    }

    [Fact]
    public async Task StopAsync_WhenDeviceStopFailsOnce_AllowsRetry()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);
        var stopAttempts = 0;
        _progressorService.StopMeasurementAsync(cancellationToken).Returns(_ =>
        {
            stopAttempts++;
            return stopAttempts == 1
                ? Task.FromException(new InvalidOperationException("Failed to send stop command."))
                : Task.CompletedTask;
        });

        // Act
        Func<Task> firstStop = async () => await _sut.StopAsync(cancellationToken);
        var secondStop = async () => await _sut.StopAsync(cancellationToken);

        // Assert
        await firstStop.Should().ThrowAsync<InvalidOperationException>();
        await secondStop.Should().NotThrowAsync();
        await _progressorService.Received(2).StopMeasurementAsync(cancellationToken);
    }

    [Fact]
    public async Task FlushTimer_WhenSamplesPending_SendsLastSample()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);
        var samples = new[]
        {
            new ForceSample(8f, 0.1),
            new ForceSample(12f, 0.2),
            new ForceSample(16f, 0.3),
        };

        // Act
        _progressorService.SamplesReceived += Raise.Event<Action<ForceSample[]>>(samples);
        await Task.Delay(TimeSpan.FromMilliseconds(175), cancellationToken);

        // Assert
        await _notifier.Received().SendForceSamplesAsync(Arg.Is<ForceSample[]>(batch =>
            batch.Length == 1 &&
            Math.Abs(batch[0].WeightKg - 16f) < 0.001f &&
            Math.Abs(batch[0].TimestampSeconds - 0.3d) < 0.001d));

        await _sut.StopAsync(cancellationToken);
    }

    [Fact]
    public async Task Reconnected_WhenStreaming_RestartsMeasurement()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);

        _progressorService.ConnectAsync(Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _progressorService.GetBatteryVoltageAsync(Arg.Any<CancellationToken>()).Returns(3.9f);
        _progressorService.GetFirmwareVersionAsync(Arg.Any<CancellationToken>()).Returns("fw");
        _progressorService.IsConnected.Returns(true);
        _progressorService.DeviceName.Returns("Progressor-Test");
        _progressorService.BatteryVoltage.Returns(3.9f);
        _progressorService.FirmwareVersion.Returns("fw");

        _progressorService.ConnectionStatusChanged += Raise.Event<Action<bool>>(false);
        await Task.Delay(50, cancellationToken);

        await _progressorService.Received(2).StartMeasurementAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ReconnectionFailed_WhenStreaming_SendsStoppedNotification()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var liveStreamStopped = new TaskCompletionSource<LiveStreamStatsDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        _notifier.SendLiveStreamStoppedAsync(Arg.Any<LiveStreamStatsDto>()).Returns(callInfo =>
        {
            liveStreamStopped.TrySetResult(callInfo.Arg<LiveStreamStatsDto>());
            return Task.CompletedTask;
        });

        await _sut.StartAsync(cancellationToken);
        _progressorService.SamplesReceived += Raise.Event<Action<ForceSample[]>>(new[] { new ForceSample(11f, 0.25) });
        _progressorService.ConnectAsync(Arg.Any<CancellationToken>()).Returns<Task>(_ =>
            throw new InvalidOperationException("Still disconnected."));

        _progressorService.ConnectionStatusChanged += Raise.Event<Action<bool>>(false);
        var stats = await liveStreamStopped.Task.WaitAsync(cancellationToken);

        stats.PeakForceKg.Should().Be(11d);
        stats.DurationSeconds.Should().Be(0.25d);
        stats.AvgForceKg.Should().Be(11d);
        await _progressorService.Received(3).ConnectAsync(Arg.Any<CancellationToken>());
    }
}
