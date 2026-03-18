namespace TindeqTrainer.Application.Features.Protocols.Queries.GetProtocol;

public record ProtocolDto(
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
