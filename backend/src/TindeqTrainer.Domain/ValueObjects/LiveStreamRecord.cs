namespace TindeqTrainer.Domain.ValueObjects;

public sealed record LiveStreamRecord(
    Guid Id,
    DateTime Date,
    List<ForceSample> Samples,
    double PeakForceKg,
    double AvgForceKg,
    TimeSpan Duration);
