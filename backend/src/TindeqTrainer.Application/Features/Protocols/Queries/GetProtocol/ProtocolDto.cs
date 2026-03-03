namespace TindeqTrainer.Application.Features.Protocols.Queries.GetProtocol;

public record ProtocolDto(
    Guid Id,
    string Name,
    double MaxWeightKg,
    double WeightPercentage,
    int SetsPerHand,
    double WorkSeconds,
    double RestSeconds,
    double HandSwitchSeconds,
    double CountdownSeconds,
    bool AudioCues,
    bool CountdownBeeps,
    bool IsDefault,
    double TargetWeightKg);
