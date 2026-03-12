using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Services;
using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Application.Tests.Services;

public sealed class BleConnectionMonitorTests
{
    [Fact]
    public async Task PrepareIntentionalDisconnect_WhenDeviceDisconnects_DoesNotStartReconnection()
    {
        var progressorService = TestProgressorService.CreateConnected();
        var notifier = new TestConnectionNotifier();
        var sut = CreateSut(progressorService, notifier);

        sut.PrepareIntentionalDisconnect();
        await progressorService.DisconnectAsync();
        await Task.Delay(50, TestContext.Current.CancellationToken);

        notifier.ConnectionLostCount.Should().Be(0);
        progressorService.ConnectCallCount.Should().Be(0);
        sut.IsReconnecting.Should().BeFalse();
    }

    [Fact]
    public async Task UnexpectedDisconnect_WhenFirstRetrySucceeds_ReconnectsAndNotifiesClients()
    {
        var progressorService = TestProgressorService.CreateConnected();
        var notifier = new TestConnectionNotifier();
        var sut = CreateSut(progressorService, notifier);

        progressorService.SimulateUnexpectedDisconnect();

        await notifier.ConnectionLost.Task.WaitAsync(TestContext.Current.CancellationToken);
        var status = await notifier.Reconnected.Task.WaitAsync(TestContext.Current.CancellationToken);

        notifier.ConnectionLostCount.Should().Be(1);
        progressorService.ConnectCallCount.Should().Be(1);
        status.IsConnected.Should().BeTrue();
        status.DeviceName.Should().Be("Progressor-Test");
        sut.IsReconnecting.Should().BeFalse();
    }

    [Fact]
    public async Task UnexpectedDisconnect_WhenReconnectSucceedsAfterRetries_AttemptsUntilSuccess()
    {
        var progressorService = TestProgressorService.CreateConnected();
        progressorService.ConnectFailuresRemaining = 2;
        var notifier = new TestConnectionNotifier();
        var sut = CreateSut(progressorService, notifier);

        progressorService.SimulateUnexpectedDisconnect();

        await notifier.Reconnected.Task.WaitAsync(TestContext.Current.CancellationToken);

        progressorService.ConnectCallCount.Should().Be(3);
        notifier.ConnectionLostCount.Should().Be(1);
        notifier.ReconnectionFailedCount.Should().Be(0);
        sut.IsReconnecting.Should().BeFalse();
    }

    [Fact]
    public async Task UnexpectedDisconnect_WhenAllRetriesFail_RaisesReconnectionFailed()
    {
        var progressorService = TestProgressorService.CreateConnected();
        progressorService.ConnectFailuresRemaining = int.MaxValue;
        var notifier = new TestConnectionNotifier();
        var sut = CreateSut(progressorService, notifier, maxAttempts: 3);

        progressorService.SimulateUnexpectedDisconnect();

        await notifier.ReconnectionFailed.Task.WaitAsync(TestContext.Current.CancellationToken);

        notifier.ConnectionLostCount.Should().Be(1);
        notifier.ReconnectionFailedCount.Should().Be(1);
        progressorService.ConnectCallCount.Should().Be(3);
        sut.IsReconnecting.Should().BeFalse();
    }

    [Fact]
    public async Task CancelReconnection_WhenLoopIsRunning_StopsFurtherRetries()
    {
        var progressorService = TestProgressorService.CreateConnected();
        progressorService.ConnectFailuresRemaining = int.MaxValue;
        var notifier = new TestConnectionNotifier();
        var sut = CreateSut(progressorService, notifier, retryDelay: TimeSpan.FromMilliseconds(25), maxAttempts: 20);

        progressorService.SimulateUnexpectedDisconnect();
        await notifier.ConnectionLost.Task.WaitAsync(TestContext.Current.CancellationToken);
        await Task.Delay(60, TestContext.Current.CancellationToken);

        sut.CancelReconnection();
        var attemptsAfterCancel = progressorService.ConnectCallCount;

        await Task.Delay(100, TestContext.Current.CancellationToken);

        progressorService.ConnectCallCount.Should().Be(attemptsAfterCancel);
        notifier.ReconnectionFailedCount.Should().Be(0);
        sut.IsReconnecting.Should().BeFalse();
    }

    [Fact]
    public async Task UnexpectedDisconnect_WhenReconnectSucceeds_RaisesReconnectedEvent()
    {
        var progressorService = TestProgressorService.CreateConnected();
        var notifier = new TestConnectionNotifier();
        var sut = CreateSut(progressorService, notifier);
        var reconnected = new TaskCompletionSource<DeviceStatusDto>(TaskCreationOptions.RunContinuationsAsynchronously);
        sut.Reconnected += status => reconnected.TrySetResult(status);

        progressorService.SimulateUnexpectedDisconnect();

        var status = await reconnected.Task.WaitAsync(TestContext.Current.CancellationToken);

        status.IsConnected.Should().BeTrue();
        status.DeviceName.Should().Be("Progressor-Test");
    }

    [Fact]
    public async Task UnexpectedDisconnect_WhileAlreadyReconnecting_DoesNotStartSecondLoop()
    {
        var progressorService = TestProgressorService.CreateConnected();
        progressorService.ConnectFailuresRemaining = 1;
        var notifier = new TestConnectionNotifier();
        var sut = CreateSut(progressorService, notifier);

        progressorService.SimulateUnexpectedDisconnect();
        progressorService.SimulateUnexpectedDisconnect();

        await notifier.Reconnected.Task.WaitAsync(TestContext.Current.CancellationToken);

        notifier.ConnectionLostCount.Should().Be(1);
        progressorService.ConnectCallCount.Should().Be(2);
        sut.IsReconnecting.Should().BeFalse();
    }

    private static BleConnectionMonitor CreateSut(
        TestProgressorService progressorService,
        TestConnectionNotifier notifier,
        TimeSpan? retryDelay = null,
        int maxAttempts = 5)
    {
        return new BleConnectionMonitor(
            progressorService,
            notifier,
            NullLogger<BleConnectionMonitor>.Instance,
            retryDelay ?? TimeSpan.FromMilliseconds(5),
            maxAttempts);
    }

    private sealed class TestConnectionNotifier : IConnectionNotifier
    {
        public TaskCompletionSource<bool> ConnectionLost { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<DeviceStatusDto> Reconnected { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource<bool> ReconnectionFailed { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public int ConnectionLostCount { get; private set; }
        public int ReconnectionFailedCount { get; private set; }

        public Task SendConnectionLostAsync()
        {
            ConnectionLostCount++;
            ConnectionLost.TrySetResult(true);
            return Task.CompletedTask;
        }

        public Task SendReconnectedAsync(DeviceStatusDto status)
        {
            Reconnected.TrySetResult(status);
            return Task.CompletedTask;
        }

        public Task SendReconnectionFailedAsync()
        {
            ReconnectionFailedCount++;
            ReconnectionFailed.TrySetResult(true);
            return Task.CompletedTask;
        }
    }

    private sealed class TestProgressorService : IProgressorService
    {
        public bool IsConnected { get; private set; }

        public string? DeviceName { get; private set; }

        public float? BatteryVoltage { get; private set; }

        public string? FirmwareVersion { get; private set; }

        public int ConnectFailuresRemaining { get; set; }

        public int ConnectCallCount { get; private set; }

        public event Action<ForceSample[]>? SamplesReceived
        {
            add
            {
            }
            remove
            {
            }
        }

        public event Action<bool>? ConnectionStatusChanged;

        public static TestProgressorService CreateConnected()
        {
            return new TestProgressorService
            {
                IsConnected = true,
                DeviceName = "Progressor-Test",
                BatteryVoltage = 3.91f,
                FirmwareVersion = "test-fw",
            };
        }

        public Task ConnectAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            ConnectCallCount++;

            if (ConnectFailuresRemaining > 0)
            {
                ConnectFailuresRemaining--;
                throw new InvalidOperationException("Reconnect failed.");
            }

            IsConnected = true;
            DeviceName = "Progressor-Test";
            BatteryVoltage = 3.91f;
            FirmwareVersion = "test-fw";
            ConnectionStatusChanged?.Invoke(true);
            return Task.CompletedTask;
        }

        public void CancelConnect()
        {
        }

        public Task DisconnectAsync()
        {
            var wasConnected = IsConnected;
            IsConnected = false;
            DeviceName = null;
            BatteryVoltage = null;
            FirmwareVersion = null;

            if (wasConnected)
            {
                ConnectionStatusChanged?.Invoke(false);
            }

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
            return Task.FromResult(BatteryVoltage ?? 0f);
        }

        public Task<string> GetFirmwareVersionAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            return Task.FromResult(FirmwareVersion ?? string.Empty);
        }

        public ValueTask DisposeAsync()
        {
            return ValueTask.CompletedTask;
        }

        public void SimulateUnexpectedDisconnect()
        {
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
    }
}
