using Microsoft.AspNetCore.SignalR;
using TindeqTrainer.Api.Hubs;
using TindeqTrainer.Application.Services;
using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Api.Services;

public sealed class SignalRLiveStreamNotifier(
    IHubContext<TrainingHub> hubContext) : ILiveStreamNotifier
{
    public Task SendForceSamplesAsync(ForceSample[] samples)
    {
        return hubContext.Clients.All.SendAsync("ForceSamples", samples);
    }

    public Task SendForceStreamStateChangedAsync(bool isActive)
    {
        return hubContext.Clients.All.SendAsync("ForceStreamStateChanged", isActive);
    }

    public Task SendLiveStreamStoppedAsync(LiveStreamStatsDto stats)
    {
        return hubContext.Clients.All.SendAsync("LiveStreamStopped", stats);
    }
}
