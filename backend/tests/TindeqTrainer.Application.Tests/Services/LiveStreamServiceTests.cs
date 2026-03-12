using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Enums;
using TindeqTrainer.Domain.Services;
using TindeqTrainer.Domain.ValueObjects;
using TindeqTrainer.Infrastructure.Persistence;

namespace TindeqTrainer.Application.Tests.Services;

public sealed class LiveStreamServiceTests : IDisposable
{
    private readonly IProgressorService _progressorService;
    private readonly ILiveStreamNotifier _notifier;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IServiceScope _scope;
    private readonly IServiceProvider _serviceProvider;
    private readonly BleConnectionMonitor _connectionMonitor;
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _dbContext;
    private readonly LiveStreamService _sut;

    public LiveStreamServiceTests()
    {
        _progressorService = Substitute.For<IProgressorService>();
        _notifier = Substitute.For<ILiveStreamNotifier>();
        _serviceScopeFactory = Substitute.For<IServiceScopeFactory>();
        _scope = Substitute.For<IServiceScope>();
        _serviceProvider = Substitute.For<IServiceProvider>();

        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _dbContext = new AppDbContext(options);
        _dbContext.Database.EnsureCreated();

        _serviceProvider.GetService(typeof(AppDbContext)).Returns(_dbContext);
        _scope.ServiceProvider.Returns(_serviceProvider);
        _serviceScopeFactory.CreateScope().Returns(_scope);

        var connectionNotifier = Substitute.For<IConnectionNotifier>();
        _connectionMonitor = new BleConnectionMonitor(
            _progressorService,
            connectionNotifier,
            NullLogger<BleConnectionMonitor>.Instance,
            TimeSpan.FromMilliseconds(5),
            3);

        _sut = new LiveStreamService(
            _progressorService,
            _notifier,
            _serviceScopeFactory,
            _connectionMonitor,
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
    public async Task FlushTimer_WhenSamplesPending_SendsDecimatedAveragedSample()
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
            Math.Abs(batch[0].WeightKg - 12f) < 0.001f &&
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
    public async Task ReconnectionFailed_WhenStreaming_FinalizesStoppedSession()
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
        Func<Task> act = () => _sut.SaveAsync(cancellationToken);
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SaveAsync_WhenIdle_ThrowsInvalidOperation()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;

        // Act
        Func<Task> act = () => _sut.SaveAsync(cancellationToken);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task SaveAsync_WhenStopped_PersistsSessionAndSamples()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);
        var samples = new[]
        {
            new ForceSample(20f, 0.1),
            new ForceSample(30f, 0.3),
        };
        _progressorService.SamplesReceived += Raise.Event<Action<ForceSample[]>>(samples);
        await _sut.StopAsync(cancellationToken);

        // Act
        var sessionId = await _sut.SaveAsync(cancellationToken);

        // Assert
        var session = await _dbContext.Sessions
            .Include(x => x.Samples)
            .SingleAsync(x => x.Id == sessionId, TestContext.Current.CancellationToken);

        session.Type.Should().Be(SessionType.LiveStream);
        session.ProtocolName.Should().Be("Live Stream");
        session.IsComplete.Should().BeTrue();
        session.PeakForceKg.Should().Be(30d);
        session.AvgForceKg.Should().Be(25d);
        session.DurationSeconds.Should().Be(0.3d);
        session.Samples.Should().HaveCount(2);
        session.Samples.Select(x => x.WeightKg).Should().ContainInOrder(20f, 30f);
    }

    [Fact]
    public async Task Discard_WhenStopped_ClearsBuffersWithoutPersisting()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        await _sut.StartAsync(cancellationToken);
        _progressorService.SamplesReceived += Raise.Event<Action<ForceSample[]>>(new[] { new ForceSample(18f, 0.15) });
        await _sut.StopAsync(cancellationToken);

        // Act
        _sut.Discard();

        // Assert
        Func<Task> act = () => _sut.SaveAsync(cancellationToken);
        await act.Should().ThrowAsync<InvalidOperationException>();
        (await _dbContext.Sessions.CountAsync(TestContext.Current.CancellationToken)).Should().Be(0);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
        _connection.Dispose();
    }
}
