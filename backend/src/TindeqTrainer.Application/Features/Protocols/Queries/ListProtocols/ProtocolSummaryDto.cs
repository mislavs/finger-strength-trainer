namespace TindeqTrainer.Application.Features.Protocols.Queries.ListProtocols;

public record ProtocolSummaryDto(
    Guid Id,
    string Name,
    double WeightPercentage,
    int RepsPerSet,
    int NumberOfSets,
    double WorkSeconds);
