using TindeqTrainer.Domain.Enums;

namespace TindeqTrainer.Domain.Entities;

public class Session
{
    private Session()
    {
    }

    public Guid Id { get; private set; }

    public DateTime Date { get; private set; }

    public SessionType Type { get; private set; }

    public Guid? ProtocolId { get; private set; }

    public string ProtocolName { get; private set; } = string.Empty;

    public bool IsComplete { get; private set; }

    public double PeakForceKg { get; private set; }

    public double AvgForceKg { get; private set; }

    public double DurationSeconds { get; private set; }

    public Protocol? Protocol { get; private set; }

    public ICollection<SessionSample> Samples { get; private set; } = [];

    public static Session Create(
        DateTime date,
        SessionType type,
        Guid? protocolId,
        string protocolName,
        bool isComplete,
        double peakForceKg,
        double avgForceKg,
        double durationSeconds,
        Guid? id = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(protocolName);

        if (peakForceKg < 0 || avgForceKg < 0 || durationSeconds < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(peakForceKg), "Session summary values must be non-negative.");
        }

        return new Session
        {
            Id = id ?? Guid.NewGuid(),
            Date = date,
            Type = type,
            ProtocolId = protocolId,
            ProtocolName = protocolName.Trim(),
            IsComplete = isComplete,
            PeakForceKg = peakForceKg,
            AvgForceKg = avgForceKg,
            DurationSeconds = durationSeconds
        };
    }
}
