namespace TindeqTrainer.Domain.ValueObjects;

public sealed record SetStats(
    int SetNumber,
    double AvgForceKg,
    double PeakForceKg,
    double PercentTimeAboveTarget,
    double DurationSeconds);
