using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using TindeqTrainer.Api.Hubs;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Application.Tests.Hubs;

public sealed class TrainingHubTests
{
    private readonly IProgressorService _progressorService;
    private readonly IConnectionNotifier _connectionNotifier;
    private readonly IHubCallerClients _clients;
    private readonly IClientProxy _allClientProxy;
    private readonly LiveStreamService _liveStreamService;
    private readonly RepeaterStreamService _repeaterStreamService;
    private readonly TrainingHub _sut;

    public TrainingHubTests()
    {
        _progressorService = Substitute.For<IProgressorService>();
        _connectionNotifier = Substitute.For<IConnectionNotifier>();
        _clients = Substitute.For<IHubCallerClients>();
        _allClientProxy = Substitute.For<IClientProxy>();
        var notifier = Substitute.For<ILiveStreamNotifier>();
        var connectionMonitor = new BleConnectionMonitor(
            _progressorService,
            _connectionNotifier,
            NullLogger<BleConnectionMonitor>.Instance,
            TimeSpan.FromMilliseconds(5),
            3);
        _liveStreamService = new LiveStreamService(
            _progressorService,
            notifier,
            connectionMonitor,
            NullLogger<LiveStreamService>.Instance);
        _repeaterStreamService = new RepeaterStreamService(
            _progressorService,
            notifier,
            NullLogger<RepeaterStreamService>.Instance);

        _allClientProxy
            .SendCoreAsync(Arg.Any<string>(), Arg.Any<object?[]>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);
        _clients.All.Returns(_allClientProxy);
        _progressorService.IsConnected.Returns(false);
        _progressorService.DeviceName.Returns((string?)null);
        _progressorService.BatteryVoltage.Returns((float?)null);
        _progressorService.FirmwareVersion.Returns((string?)null);

        _sut = new TrainingHub(_progressorService, _liveStreamService, _repeaterStreamService, connectionMonitor)
        {
            Clients = _clients,
            Context = new TestHubCallerContext(TestContext.Current.CancellationToken),
        };
    }

    [Fact]
    public async Task Connect_WhenUserCancels_BroadcastsStatusWithoutError()
    {
        using var userCancelCts = new CancellationTokenSource();
        userCancelCts.Cancel();
        _progressorService
            .ConnectAsync(Arg.Any<CancellationToken>())
            .Returns(_ => Task.FromException(new OperationCanceledException(userCancelCts.Token)));

        var act = () => _sut.Connect();

        await act.Should().NotThrowAsync();
        await _allClientProxy.Received(1).SendCoreAsync(
            "DeviceStatus",
            Arg.Any<object?[]>(),
            TestContext.Current.CancellationToken);

        var sendCall = _allClientProxy.ReceivedCalls().Single(call => call.GetMethodInfo().Name == nameof(IClientProxy.SendCoreAsync));
        var sentArgs = sendCall.GetArguments()[1].Should().BeAssignableTo<object?[]>().Subject;
        var status = sentArgs[0].Should().BeOfType<DeviceStatusDto>().Subject;
        status.IsConnected.Should().BeFalse();
        status.DeviceName.Should().BeNull();
        status.BatteryVoltage.Should().BeNull();
        status.FirmwareVersion.Should().BeNull();
    }

    [Fact]
    public async Task Connect_WhenConnectionAborted_PropagatesException()
    {
        using var connectionAbortedCts = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        connectionAbortedCts.Cancel();
        _sut.Context = new TestHubCallerContext(connectionAbortedCts.Token);
        _progressorService
            .ConnectAsync(Arg.Any<CancellationToken>())
            .Returns(_ => Task.FromException(new OperationCanceledException(connectionAbortedCts.Token)));

        var act = () => _sut.Connect();

        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    [Fact]
    public async Task CancelConnect_CallsServiceCancelConnect()
    {
        await _sut.CancelConnect();

        _progressorService.Received(1).CancelConnect();
    }

    [Fact]
    public async Task Disconnect_WhenCalled_DoesNotTriggerAutomaticReconnect()
    {
        _progressorService.IsConnected.Returns(true);
        _progressorService.DisconnectAsync().Returns(_ =>
        {
            _progressorService.ConnectionStatusChanged += Raise.Event<Action<bool>>(false);
            return Task.CompletedTask;
        });

        await _sut.Disconnect();
        await Task.Delay(25, TestContext.Current.CancellationToken);

        await _connectionNotifier.DidNotReceive().SendConnectionLostAsync();
    }

    [Fact]
    public async Task StartLiveStream_WhenRepeaterStreamIsRunning_ThrowsHubException()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await _repeaterStreamService.StartAsync(cancellationToken);

        var act = () => _sut.StartLiveStream();

        await act.Should().ThrowAsync<HubException>()
            .WithMessage("Stop the repeater stream before starting a live stream.");

        await _repeaterStreamService.StopAsync(cancellationToken);
    }

    [Fact]
    public async Task StartRepeaterStream_WhenLiveStreamIsRunning_ThrowsHubException()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        await _liveStreamService.StartAsync(cancellationToken);

        var act = () => _sut.StartRepeaterStream();

        await act.Should().ThrowAsync<HubException>()
            .WithMessage("Stop the live stream before starting repeater force streaming.");

        await _liveStreamService.StopAsync(cancellationToken);
    }

    [Fact]
    public async Task StopRepeaterStream_WhenIdle_IsNoOp()
    {
        var act = () => _sut.StopRepeaterStream();

        await act.Should().NotThrowAsync();
        await _progressorService.DidNotReceive().StopMeasurementAsync(Arg.Any<CancellationToken>());
    }

    private sealed class TestHubCallerContext(CancellationToken connectionAborted) : HubCallerContext
    {
        private readonly IDictionary<object, object?> _items = new Dictionary<object, object?>();
        private readonly IFeatureCollection _features = new FeatureCollection();

        public override string ConnectionId => "connection-id";
        public override string? UserIdentifier => "test-user";
        public override ClaimsPrincipal? User => null;
        public override IDictionary<object, object?> Items => _items;
        public override IFeatureCollection Features => _features;
        public override CancellationToken ConnectionAborted => connectionAborted;

        public override void Abort()
        {
        }
    }
}
