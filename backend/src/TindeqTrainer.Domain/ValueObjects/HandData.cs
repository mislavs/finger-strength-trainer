namespace TindeqTrainer.Domain.ValueObjects;

public sealed record HandData(
    string Hand,
    List<ForceSample> Samples,
    List<SetStats> Sets);
