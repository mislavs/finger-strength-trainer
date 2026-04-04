namespace TindeqTrainer.Api.Contracts;

public record WorkoutProtocolItemRequest(
    Guid RepeaterProtocolId,
    int Repetitions,
    double RestAfterSeconds);
