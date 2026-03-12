using Microsoft.AspNetCore.SignalR;
using TindeqTrainer.Api.Hubs;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.Services;

namespace TindeqTrainer.Api.Services;

public sealed class SignalRConnectionNotifier(
    IHubContext<TrainingHub> hubContext) : IConnectionNotifier
{
    public Task SendConnectionLostAsync()
    {
        return hubContext.Clients.All.SendAsync("ConnectionLost");
    }

    public Task SendReconnectedAsync(DeviceStatusDto status)
    {
        return hubContext.Clients.All.SendAsync("Reconnected", status);
    }

    public Task SendReconnectionFailedAsync()
    {
        return hubContext.Clients.All.SendAsync("ReconnectionFailed");
    }
}
