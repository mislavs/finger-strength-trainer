using Microsoft.AspNetCore.SignalR;

namespace TindeqTrainer.Api.Hubs;

public sealed class HubExceptionFilter(ILogger<HubExceptionFilter> logger) : IHubFilter
{
    private const string GenericErrorMessage = "Something went wrong. Please try again.";
    private const string ConnectFailedMessage = "Could not connect to your Tindeq Progressor. Please try again.";
    private const string NoProgressorFoundMessage = "No Tindeq Progressor found";
    private const string ConnectFirstMessage = "Connect your Tindeq Progressor first";
    private const string DeviceNoResponseMessage = "Device did not respond. Try reconnecting.";
    private const string DeviceInitFailedMessage = "Could not initialize device. Reconnect and try again.";
    private const string LiveStreamAlreadyRunningMessage = "Live stream is already running";
    private const string LiveStreamNotRunningMessage = "Live stream is not running";
    private const string StopBeforeSaveDiscardMessage = "Stop the live stream before saving or discarding";

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        try
        {
            return await next(invocationContext);
        }
        catch (OperationCanceledException) when (invocationContext.Context.ConnectionAborted.IsCancellationRequested)
        {
            logger.LogDebug(
                "Hub method {Method} was canceled because the client disconnected",
                invocationContext.HubMethodName);
            throw;
        }
        catch (OperationCanceledException)
        {
            logger.LogDebug(
                "Hub method {Method} was canceled",
                invocationContext.HubMethodName);
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Hub method {Method} failed for connection {ConnectionId}",
                invocationContext.HubMethodName,
                invocationContext.Context.ConnectionId);

            throw new HubException(MapToFriendlyMessage(invocationContext.HubMethodName, ex));
        }
    }

    private static string MapToFriendlyMessage(string hubMethodName, Exception exception)
    {
        var message = exception.Message;

        if (exception is TimeoutException && Contains(message, "No Tindeq Progressor"))
        {
            return NoProgressorFoundMessage;
        }

        if (exception is TimeoutException && Contains(message, "Timed out waiting for response"))
        {
            return DeviceNoResponseMessage;
        }

        if (exception is InvalidOperationException)
        {
            if (ContainsAny(
                    message,
                    "Cannot send command before connecting",
                    "Progressor is not connected"))
            {
                return ConnectFirstMessage;
            }

            if (ContainsAny(
                    message,
                    "Failed to create Bluetooth device",
                    "GATT service was not found",
                    "characteristic was not found",
                    "Failed to resolve the Progressor GATT service",
                    "Failed to resolve the Data Point characteristic",
                    "Failed to resolve the Control Point characteristic",
                    "Failed to enable notifications on the Data Point characteristic"))
            {
                return DeviceInitFailedMessage;
            }

            if (Contains(message, "Failed to send command"))
            {
                return DeviceNoResponseMessage;
            }

            if (Contains(message, "Live stream can only start from the idle state"))
            {
                return LiveStreamAlreadyRunningMessage;
            }

            if (Contains(message, "Live stream can only stop from the streaming state"))
            {
                return LiveStreamNotRunningMessage;
            }

            if (ContainsAny(
                    message,
                    "Live stream can only be saved from the stopped state",
                    "Live stream can only be discarded from the stopped state"))
            {
                return StopBeforeSaveDiscardMessage;
            }
        }

        if (hubMethodName.Equals(nameof(TrainingHub.Connect), StringComparison.Ordinal))
        {
            return ConnectFailedMessage;
        }

        return GenericErrorMessage;
    }

    private static bool Contains(string message, string value)
    {
        return message.Contains(value, StringComparison.OrdinalIgnoreCase);
    }

    private static bool ContainsAny(string message, params string[] candidates)
    {
        return candidates.Any(candidate => Contains(message, candidate));
    }
}
