namespace TindeqTrainer.Application.Features.Sessions.Queries.ListSessions;

public record SessionSummaryDto(
    Guid Id,
    DateTime Date,
    string Type,
    string ProtocolName,
    bool IsComplete,
    double PeakForceKg,
    double AvgForceKg,
    double DurationSeconds);
