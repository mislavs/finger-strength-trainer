namespace TindeqTrainer.Api.Contracts;

public record CreateProtocolRequest(
    string Name,
    double MaxWeightKg,
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
