namespace TindeqTrainer.Application.Features.Sessions.Queries.GetSession;

public record SessionDetailDto(
    Guid Id,
    DateTime Date,
    string Type,
    string ProtocolName,
    bool IsComplete,
    double PeakForceKg,
    double AvgForceKg,
    double DurationSeconds,
    List<SessionSampleDto> Samples);

public record SessionSampleDto(
    string? Hand,
    int? SetNumber,
    float WeightKg,
    double TimestampSeconds);
