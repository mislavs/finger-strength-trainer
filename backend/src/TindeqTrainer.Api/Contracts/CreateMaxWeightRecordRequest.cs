namespace TindeqTrainer.Api.Contracts;

public record CreateMaxWeightRecordRequest(
    double? LeftWeightKg,
    double? RightWeightKg,
    DateTime? RecordedAt);
