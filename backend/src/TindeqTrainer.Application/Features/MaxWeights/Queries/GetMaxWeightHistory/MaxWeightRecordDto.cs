namespace TindeqTrainer.Application.Features.MaxWeights.Queries.GetMaxWeightHistory;

public record MaxWeightRecordDto(
    Guid Id,
    string Hand,
    double WeightKg,
    DateTime RecordedAt);
