namespace TindeqTrainer.Api.Contracts;

public record UpdateWorkoutProtocolRequest(
    string Name,
    IReadOnlyCollection<WorkoutProtocolItemRequest> Items);
