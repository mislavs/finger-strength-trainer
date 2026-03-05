namespace TindeqTrainer.Application.Services;

public sealed record LiveStreamStatsDto(
    double PeakForceKg,
    double AvgForceKg,
    double DurationSeconds);
