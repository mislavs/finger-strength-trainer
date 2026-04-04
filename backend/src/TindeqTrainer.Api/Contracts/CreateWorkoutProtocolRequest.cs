namespace TindeqTrainer.Api.Contracts;

public record CreateWorkoutProtocolRequest(
    string Name,
    IReadOnlyCollection<WorkoutProtocolItemRequest> Items);
