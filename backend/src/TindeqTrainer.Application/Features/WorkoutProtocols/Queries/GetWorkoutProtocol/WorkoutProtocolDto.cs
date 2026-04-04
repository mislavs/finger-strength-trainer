namespace TindeqTrainer.Application.Features.WorkoutProtocols.Queries.GetWorkoutProtocol;

public record WorkoutProtocolDto(
    Guid Id,
    string Name,
    IReadOnlyList<WorkoutProtocolItemDto> Items);
