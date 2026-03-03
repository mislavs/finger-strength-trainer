namespace TindeqTrainer.Domain.Entities;

public class SessionSample
{
    private SessionSample()
    {
    }

    public Guid Id { get; private set; }

    public Guid SessionId { get; private set; }

    public string? Hand { get; private set; }

    public int? SetNumber { get; private set; }

    public float WeightKg { get; private set; }

    public double TimestampSeconds { get; private set; }

    public Session Session { get; private set; } = null!;

    public static SessionSample Create(
        Guid sessionId,
        float weightKg,
        double timestampSeconds,
        string? hand = null,
        int? setNumber = null,
        Guid? id = null)
    {
        if (timestampSeconds < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(timestampSeconds), "Timestamp must be non-negative.");
        }

        if (setNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(setNumber), "Set number must be null or greater than zero.");
        }

        return new SessionSample
        {
            Id = id ?? Guid.NewGuid(),
            SessionId = sessionId,
            Hand = hand,
            SetNumber = setNumber,
            WeightKg = weightKg,
            TimestampSeconds = timestampSeconds
        };
    }
}
