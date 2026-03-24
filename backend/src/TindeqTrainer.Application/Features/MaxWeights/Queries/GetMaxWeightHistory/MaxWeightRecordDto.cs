namespace TindeqTrainer.Application.Features.MaxWeights.Queries.GetMaxWeightHistory;

public record MaxWeightRecordDto(
    Guid Id,
    double? LeftWeightKg,
    double? RightWeightKg,
    DateTime RecordedAt);
