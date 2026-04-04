namespace TindeqTrainer.Application.Features.RepeaterProtocols.Queries.ListRepeaterProtocols;

public record RepeaterProtocolSummaryDto(
    Guid Id,
    string Name,
    double WeightPercentage,
    int RepsPerSet,
    int NumberOfSets,
    double WorkSeconds);
