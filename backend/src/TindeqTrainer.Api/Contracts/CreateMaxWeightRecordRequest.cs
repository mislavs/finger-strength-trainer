namespace TindeqTrainer.Api.Contracts;

public record CreateMaxWeightRecordRequest(
    string Hand,
    double WeightKg,
    DateTime? RecordedAt);
