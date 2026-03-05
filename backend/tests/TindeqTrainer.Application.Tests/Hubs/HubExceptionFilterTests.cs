using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using TindeqTrainer.Api.Hubs;

namespace TindeqTrainer.Application.Tests.Hubs;

public sealed class HubExceptionFilterTests
{
    private readonly RecordingLogger<HubExceptionFilter> _logger = new();
    private readonly HubExceptionFilter _sut;

    public HubExceptionFilterTests()
    {
        _sut = new HubExceptionFilter(_logger);
    }

    [Fact]
    public async Task InvokeMethodAsync_WhenScanTimesOut_ThrowsFriendlyHubException()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        var invocationContext = CreateInvocationContext(cancellationToken: cancellationToken);
        var exception = new TimeoutException("No Tindeq Progressor device found within the scan timeout.");

        // Act
        Func<Task> act = () => InvokeWithExceptionAsync(invocationContext, exception);

        // Assert
        var result = await act.Should().ThrowAsync<HubException>();
        result.Which.Message.Should().Be("No Tindeq Progressor found");
        _logger.Entries.Should().Contain(entry => entry.Level == LogLevel.Error && entry.Exception == exception);
    }

    [Fact]
    public async Task InvokeMethodAsync_WhenNotConnected_ThrowsFriendlyHubException()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        var invocationContext = CreateInvocationContext(cancellationToken: cancellationToken);
        var exception = new InvalidOperationException("Progressor is not connected.");

        // Act
        Func<Task> act = () => InvokeWithExceptionAsync(invocationContext, exception);

        // Assert
        var result = await act.Should().ThrowAsync<HubException>();
        result.Which.Message.Should().Be("Connect your Tindeq Progressor first");
    }

    [Theory]
    [InlineData("Live stream can only start from the idle state.", "Live stream is already running")]
    [InlineData("Live stream can only stop from the streaming state.", "Live stream is not running")]
    [InlineData("Live stream can only be saved from the stopped state.", "Stop the live stream before saving or discarding")]
    [InlineData("Live stream can only be discarded from the stopped state.", "Stop the live stream before saving or discarding")]
    public async Task InvokeMethodAsync_WhenLiveStreamStateIsInvalid_ThrowsFriendlyHubException(string message, string expected)
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        var invocationContext = CreateInvocationContext(cancellationToken: cancellationToken);
        var exception = new InvalidOperationException(message);

        // Act
        Func<Task> act = () => InvokeWithExceptionAsync(invocationContext, exception);

        // Assert
        var result = await act.Should().ThrowAsync<HubException>();
        result.Which.Message.Should().Be(expected);
    }

    [Fact]
    public async Task InvokeMethodAsync_WhenExceptionIsUnknown_ThrowsGenericHubException()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        var invocationContext = CreateInvocationContext(nameof(TestHub.Tare), cancellationToken);
        var exception = new NullReferenceException("Raw technical details");

        // Act
        Func<Task> act = () => InvokeWithExceptionAsync(invocationContext, exception);

        // Assert
        var result = await act.Should().ThrowAsync<HubException>();
        result.Which.Message.Should().Be("Something went wrong. Please try again.");
        result.Which.Message.Should().NotContain("Raw technical details");
    }

    [Fact]
    public async Task InvokeMethodAsync_WhenConnectThrowsUnknownException_ThrowsConnectFallbackMessage()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        var invocationContext = CreateInvocationContext(nameof(TestHub.Connect), cancellationToken);
        var exception = new NullReferenceException("Raw technical details");

        // Act
        Func<Task> act = () => InvokeWithExceptionAsync(invocationContext, exception);

        // Assert
        var result = await act.Should().ThrowAsync<HubException>();
        result.Which.Message.Should().Be("Could not connect to your Tindeq Progressor. Please try again.");
    }

    [Fact]
    public async Task InvokeMethodAsync_WhenInvocationIsCanceled_DoesNotMapToHubExceptionOrLogError()
    {
        // Arrange
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        cts.Cancel();
        var invocationContext = CreateInvocationContext(cancellationToken: cts.Token);
        var exception = new OperationCanceledException(cts.Token);

        // Act
        Func<Task> act = () => InvokeWithExceptionAsync(invocationContext, exception);

        // Assert
        await act.Should().ThrowAsync<OperationCanceledException>();
        _logger.Entries.Should().NotContain(entry => entry.Level == LogLevel.Error);
    }

    [Fact]
    public async Task InvokeMethodAsync_WhenInvocationSucceeds_ReturnsResult()
    {
        // Arrange
        var cancellationToken = TestContext.Current.CancellationToken;
        var invocationContext = CreateInvocationContext(cancellationToken: cancellationToken);

        // Act
        var result = await _sut.InvokeMethodAsync(
            invocationContext,
            _ => ValueTask.FromResult<object?>("ok"));

        // Assert
        result.Should().Be("ok");
    }

    private Task InvokeWithExceptionAsync(HubInvocationContext context, Exception exception)
    {
        return _sut.InvokeMethodAsync(
            context,
            _ => ValueTask.FromException<object?>(exception)).AsTask();
    }

    private static HubInvocationContext CreateInvocationContext(
        string methodName = nameof(TestHub.Connect),
        CancellationToken cancellationToken = default)
    {
        var callerContext = new TestHubCallerContext(cancellationToken);
        var hubMethod = typeof(TestHub).GetMethod(methodName)!;

        return new HubInvocationContext(
            callerContext,
            new ServiceCollection().BuildServiceProvider(),
            hub: new TestHub(),
            hubMethod,
            Array.Empty<object>());
    }

    private sealed class TestHub : Hub
    {
        public Task Connect()
        {
            return Task.CompletedTask;
        }

        public Task Tare()
        {
            return Task.CompletedTask;
        }
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

    private sealed class RecordingLogger<T> : ILogger<T>
    {
        public List<LogEntry> Entries { get; } = [];

        public IDisposable BeginScope<TState>(TState state)
            where TState : notnull
        {
            return EmptyScope.Instance;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return true;
        }

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Entries.Add(new LogEntry(logLevel, exception, formatter(state, exception)));
        }
    }

    private sealed record LogEntry(LogLevel Level, Exception? Exception, string Message);

    private sealed class EmptyScope : IDisposable
    {
        public static readonly EmptyScope Instance = new();

        public void Dispose()
        {
        }
    }
}
