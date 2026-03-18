namespace TindeqTrainer.Domain.Entities;

public class Protocol
{
    private Protocol()
    {
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public double WeightPercentage { get; private set; }

    public int RepsPerSet { get; private set; }

    public int NumberOfSets { get; private set; }

    public double WorkSeconds { get; private set; }

    public double RestSeconds { get; private set; }

    public double HandSwitchSeconds { get; private set; }

    public double SetRestSeconds { get; private set; }

    public double CountdownSeconds { get; private set; }

    public bool AudioCues { get; private set; }

    public bool CountdownBeeps { get; private set; }

    public static Protocol Create(
        string name,
        double weightPercentage,
        int repsPerSet,
        int numberOfSets,
        double workSeconds,
        double restSeconds,
        double handSwitchSeconds,
        double setRestSeconds,
        double countdownSeconds,
        bool audioCues,
        bool countdownBeeps,
        Guid? id = null)
    {
        var normalizedName = ValidateAndNormalize(
            name,
            weightPercentage,
            repsPerSet,
            numberOfSets,
            workSeconds,
            restSeconds,
            handSwitchSeconds,
            setRestSeconds,
            countdownSeconds);

        return new Protocol
        {
            Id = id ?? Guid.NewGuid(),
            Name = normalizedName,
            WeightPercentage = weightPercentage,
            RepsPerSet = repsPerSet,
            NumberOfSets = numberOfSets,
            WorkSeconds = workSeconds,
            RestSeconds = restSeconds,
            HandSwitchSeconds = handSwitchSeconds,
            SetRestSeconds = setRestSeconds,
            CountdownSeconds = countdownSeconds,
            AudioCues = audioCues,
            CountdownBeeps = countdownBeeps
        };
    }

    public void Update(
        string name,
        double weightPercentage,
        int repsPerSet,
        int numberOfSets,
        double workSeconds,
        double restSeconds,
        double handSwitchSeconds,
        double setRestSeconds,
        double countdownSeconds,
        bool audioCues,
        bool countdownBeeps)
    {
        var normalizedName = ValidateAndNormalize(
            name,
            weightPercentage,
            repsPerSet,
            numberOfSets,
            workSeconds,
            restSeconds,
            handSwitchSeconds,
            setRestSeconds,
            countdownSeconds);

        Name = normalizedName;
        WeightPercentage = weightPercentage;
        RepsPerSet = repsPerSet;
        NumberOfSets = numberOfSets;
        WorkSeconds = workSeconds;
        RestSeconds = restSeconds;
        HandSwitchSeconds = handSwitchSeconds;
        SetRestSeconds = setRestSeconds;
        CountdownSeconds = countdownSeconds;
        AudioCues = audioCues;
        CountdownBeeps = countdownBeeps;
    }

    private static string ValidateAndNormalize(
        string name,
        double weightPercentage,
        int repsPerSet,
        int numberOfSets,
        double workSeconds,
        double restSeconds,
        double handSwitchSeconds,
        double setRestSeconds,
        double countdownSeconds)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        if (weightPercentage is < 0 or > 100)
        {
            throw new ArgumentOutOfRangeException(nameof(weightPercentage), "Weight percentage must be between 0 and 100.");
        }

        if (repsPerSet <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(repsPerSet), "Reps per set must be greater than zero.");
        }

        if (numberOfSets <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(numberOfSets), "Number of sets must be greater than zero.");
        }

        if (workSeconds <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(workSeconds), "Work seconds must be greater than zero.");
        }

        if (restSeconds < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(restSeconds), "Rest seconds must be non-negative.");
        }

        if (handSwitchSeconds < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(handSwitchSeconds), "Hand switch seconds must be non-negative.");
        }

        if (setRestSeconds < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(setRestSeconds), "Set rest seconds must be non-negative.");
        }

        if (countdownSeconds < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(countdownSeconds), "Countdown seconds must be non-negative.");
        }

        return name.Trim();
    }
}
