namespace TindeqTrainer.Application.Features.RepeaterProtocols.Queries.GetRepeaterProtocol;

public record RepeaterProtocolDto(
    Guid Id,
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
