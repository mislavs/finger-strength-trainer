namespace TindeqTrainer.Application.Features.WorkoutProtocols.Queries.ListWorkoutProtocols;

public record WorkoutProtocolSummaryDto(
    Guid Id,
    string Name,
    int ItemCount,
    int TotalBlocks);
