using FluentAssertions;
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

[Collection(nameof(IntegrationTestsCollection))]
public sealed class LiveStreamServiceSaveTests(IntegrationTestFactory factory) : IntegrationTest(factory)
{
    [Fact]
    public async Task SaveAsync_WhenStoppedWithSamples_PersistsSessionAndSamples()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        var progressorService = new ManualProgressorService();
        var notifier = Substitute.For<ILiveStreamNotifier>();
        var scopeFactory = CreateScopeFactory(DbContext);
        var connectionNotifier = Substitute.For<IConnectionNotifier>();
        var connectionMonitor = new BleConnectionMonitor(
            progressorService,
            connectionNotifier,
            NullLogger<BleConnectionMonitor>.Instance,
            TimeSpan.FromMilliseconds(5),
            3);
        var sut = new LiveStreamService(
            progressorService,
            notifier,
            scopeFactory,
            connectionMonitor,
            NullLogger<LiveStreamService>.Instance);
        var samples = new[]
        {
            new ForceSample(12f, 0.1),
            new ForceSample(18f, 0.2),
            new ForceSample(21f, 0.35),
        };

        // Act
        var sessionId = await SaveSessionAsync(sut, progressorService, samples, cancellationToken);

        // Assert
        var session = await DbContext.Sessions
            .Include(x => x.Samples)
            .SingleAsync(x => x.Id == sessionId, TestContext.Current.CancellationToken);

        session.Type.Should().Be(SessionType.LiveStream);
        session.ProtocolName.Should().Be("Live Stream");
        session.IsComplete.Should().BeTrue();
        session.PeakForceKg.Should().Be(21d);
        session.AvgForceKg.Should().Be(17d, "average should be computed from all raw samples");
        session.DurationSeconds.Should().Be(0.35d);
        session.Samples.Should().HaveCount(3);
    }

    [Fact]
    public async Task SaveAsync_WhenSaved_SessionIsQueryableWithSamples()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        var progressorService = new ManualProgressorService();
        var notifier = Substitute.For<ILiveStreamNotifier>();
        var scopeFactory = CreateScopeFactory(DbContext);
        var connectionNotifier = Substitute.For<IConnectionNotifier>();
        var connectionMonitor = new BleConnectionMonitor(
            progressorService,
            connectionNotifier,
            NullLogger<BleConnectionMonitor>.Instance,
            TimeSpan.FromMilliseconds(5),
            3);
        var sut = new LiveStreamService(
            progressorService,
            notifier,
            scopeFactory,
            connectionMonitor,
            NullLogger<LiveStreamService>.Instance);
        var samples = new[]
        {
            new ForceSample(8f, 0.05),
            new ForceSample(11f, 0.2),
        };

        // Act
        var sessionId = await SaveSessionAsync(sut, progressorService, samples, cancellationToken);

        // Assert
        var loadedSession = await DbContext.Sessions
            .SingleAsync(x => x.Id == sessionId, TestContext.Current.CancellationToken);
        var orderedSamples = await DbContext.SessionSamples
            .Where(sample => sample.SessionId == loadedSession.Id)
            .OrderBy(sample => sample.TimestampSeconds)
            .ToListAsync(TestContext.Current.CancellationToken);

        orderedSamples.Should().HaveCount(2);
        orderedSamples.Select(sample => sample.WeightKg).Should().ContainInOrder(8f, 11f);
        orderedSamples.Select(sample => sample.TimestampSeconds).Should().ContainInOrder(0.05d, 0.2d);
    }

    private static IServiceScopeFactory CreateScopeFactory(AppDbContext dbContext)
    {
        var scopeFactory = Substitute.For<IServiceScopeFactory>();
        var scope = Substitute.For<IServiceScope>();
        var serviceProvider = Substitute.For<IServiceProvider>();

        serviceProvider.GetService(typeof(AppDbContext)).Returns(dbContext);
        scope.ServiceProvider.Returns(serviceProvider);
        scopeFactory.CreateScope().Returns(scope);

        return scopeFactory;
    }

    private static async Task<Guid> SaveSessionAsync(
        LiveStreamService service,
        ManualProgressorService progressorService,
        ForceSample[] samples,
        CancellationToken cancellationToken)
    {
        await service.StartAsync(cancellationToken);
        progressorService.EmitSamples(samples);
        await service.StopAsync(cancellationToken);
        return await service.SaveAsync(cancellationToken);
    }

    private sealed class ManualProgressorService : IProgressorService
    {
        public bool IsConnected => true;
        public string? DeviceName => "Integration-Mock";
        public float? BatteryVoltage => 3.8f;
        public string? FirmwareVersion => "1.0";

        public event Action<ForceSample[]>? SamplesReceived;
        public event Action<bool>? ConnectionStatusChanged;

        public Task ConnectAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            ConnectionStatusChanged?.Invoke(true);
            return Task.CompletedTask;
        }

        public void CancelConnect()
        {
        }

        public Task DisconnectAsync()
        {
            ConnectionStatusChanged?.Invoke(false);
            return Task.CompletedTask;
        }

        public Task TareAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return Task.CompletedTask;
        }

        public Task StartMeasurementAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return Task.CompletedTask;
        }

        public Task StopMeasurementAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return Task.CompletedTask;
        }

        public Task<float> GetBatteryVoltageAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult(3.8f);
        }

        public Task<string> GetFirmwareVersionAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult("1.0");
        }

        public ValueTask DisposeAsync()
        {
            return ValueTask.CompletedTask;
        }

        public void EmitSamples(ForceSample[] samples)
        {
            SamplesReceived?.Invoke(samples);
        }
    }
}
