namespace TindeqTrainer.Application.Features.WorkoutProtocols.Queries.GetWorkoutProtocol;

public record WorkoutProtocolItemDto(
    Guid RepeaterProtocolId,
    string RepeaterProtocolName,
    int Repetitions,
    double RestAfterSeconds,
    double WeightPercentage,
    int RepsPerSet,
    int NumberOfSets,
    double WorkSeconds,
    double RestSeconds,
    double HandSwitchSeconds,
    double SetRestSeconds,
    double CountdownSeconds,
    bool AudioCues,
    bool CountdownBeeps);
