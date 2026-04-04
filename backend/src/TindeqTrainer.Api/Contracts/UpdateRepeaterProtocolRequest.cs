namespace TindeqTrainer.Api.Contracts;

public record UpdateRepeaterProtocolRequest(
    string Name,
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
