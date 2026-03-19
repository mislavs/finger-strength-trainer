using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Application.Services;

public interface ILiveStreamNotifier
{
    Task SendForceSamplesAsync(ForceSample[] samples);

    Task SendForceStreamStateChangedAsync(bool isActive);

    Task SendLiveStreamStoppedAsync(LiveStreamStatsDto stats);
}
