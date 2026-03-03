namespace TindeqTrainer.Application.Features.Protocols.Queries.ListProtocols;

public record ProtocolSummaryDto(
    Guid Id,
    string Name,
    double WeightPercentage,
    int SetsPerHand,
    double WorkSeconds,
    bool IsDefault);
