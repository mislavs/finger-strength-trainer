namespace TindeqTrainer.Api.Contracts;

public record CreateProtocolRequest(
    string Name,
    double MaxWeightKg,
    double WeightPercentage,
    int SetsPerHand,
    double WorkSeconds,
    double RestSeconds,
    double HandSwitchSeconds,
    double CountdownSeconds,
    bool AudioCues,
    bool CountdownBeeps);
