namespace TindeqTrainer.Domain.Entities;

public class Protocol
{
    private Protocol()
    {
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public double MaxWeightKg { get; private set; }

    public double WeightPercentage { get; private set; }

    public int SetsPerHand { get; private set; }

    public double WorkSeconds { get; private set; }

    public double RestSeconds { get; private set; }

    public double HandSwitchSeconds { get; private set; }

    public double CountdownSeconds { get; private set; }

    public bool AudioCues { get; private set; }

    public bool CountdownBeeps { get; private set; }

    public bool IsDefault { get; private set; }

    public double TargetWeightKg => MaxWeightKg * (WeightPercentage / 100.0);

    public static Protocol Create(
        string name,
        double maxWeightKg,
        double weightPercentage,
        int setsPerHand,
        double workSeconds,
        double restSeconds,
        double handSwitchSeconds,
        double countdownSeconds,
        bool audioCues,
        bool countdownBeeps,
        bool isDefault = false,
        Guid? id = null)
    {
        var normalizedName = ValidateAndNormalize(
            name,
            maxWeightKg,
            weightPercentage,
            setsPerHand,
            workSeconds,
            restSeconds,
            handSwitchSeconds,
            countdownSeconds);

        return new Protocol
        {
            Id = id ?? Guid.NewGuid(),
            Name = normalizedName,
            MaxWeightKg = maxWeightKg,
            WeightPercentage = weightPercentage,
            SetsPerHand = setsPerHand,
            WorkSeconds = workSeconds,
            RestSeconds = restSeconds,
            HandSwitchSeconds = handSwitchSeconds,
            CountdownSeconds = countdownSeconds,
            AudioCues = audioCues,
            CountdownBeeps = countdownBeeps,
            IsDefault = isDefault
        };
    }

    public void Update(
        string name,
        double maxWeightKg,
        double weightPercentage,
        int setsPerHand,
        double workSeconds,
        double restSeconds,
        double handSwitchSeconds,
        double countdownSeconds,
        bool audioCues,
        bool countdownBeeps)
    {
        var normalizedName = ValidateAndNormalize(
            name,
            maxWeightKg,
            weightPercentage,
            setsPerHand,
            workSeconds,
            restSeconds,
            handSwitchSeconds,
            countdownSeconds);

        Name = normalizedName;
        MaxWeightKg = maxWeightKg;
        WeightPercentage = weightPercentage;
        SetsPerHand = setsPerHand;
        WorkSeconds = workSeconds;
        RestSeconds = restSeconds;
        HandSwitchSeconds = handSwitchSeconds;
        CountdownSeconds = countdownSeconds;
        AudioCues = audioCues;
        CountdownBeeps = countdownBeeps;
    }

    private static string ValidateAndNormalize(
        string name,
        double maxWeightKg,
        double weightPercentage,
        int setsPerHand,
        double workSeconds,
        double restSeconds,
        double handSwitchSeconds,
        double countdownSeconds)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        if (weightPercentage is < 0 or > 100)
        {
            throw new ArgumentOutOfRangeException(nameof(weightPercentage), "Weight percentage must be between 0 and 100.");
        }

        if (setsPerHand <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(setsPerHand), "Sets per hand must be greater than zero.");
        }

        if (maxWeightKg < 0 || workSeconds <= 0 || restSeconds < 0 || handSwitchSeconds < 0 || countdownSeconds < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(maxWeightKg), "Numeric protocol settings must be non-negative and work seconds must be greater than zero.");
        }

        return name.Trim();
    }
}
