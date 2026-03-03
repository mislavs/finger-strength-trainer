using TindeqTrainer.Domain.Enums;

namespace TindeqTrainer.Domain.ValueObjects;

public sealed record SessionSummary(
    Guid Id,
    DateTime Date,
    SessionType Type,
    string ProtocolName,
    bool IsComplete,
    double PeakForceKg,
    double AvgForceKg,
    TimeSpan Duration);
