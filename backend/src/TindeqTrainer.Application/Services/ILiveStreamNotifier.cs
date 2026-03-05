using TindeqTrainer.Domain.ValueObjects;

namespace TindeqTrainer.Application.Services;

public interface ILiveStreamNotifier
{
    Task SendForceSamplesAsync(ForceSample[] samples);

    Task SendLiveStreamStoppedAsync(LiveStreamStatsDto stats);
}
