namespace TindeqTrainer.Application.Features.WorkoutProtocols;

public record WorkoutProtocolItemInput(
    Guid RepeaterProtocolId,
    int Repetitions,
    double RestAfterSeconds);
