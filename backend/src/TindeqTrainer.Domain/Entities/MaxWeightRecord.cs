using TindeqTrainer.Domain.Enums;

namespace TindeqTrainer.Domain.Entities;

public class MaxWeightRecord
{
    private MaxWeightRecord()
    {
    }

    public Guid Id { get; private set; }

    public Hand Hand { get; private set; }

    public double WeightKg { get; private set; }

    public DateTime RecordedAt { get; private set; }

    public static MaxWeightRecord Create(
        Hand hand,
        double weightKg,
        DateTime? recordedAt = null,
        Guid? id = null)
    {
        if (weightKg <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(weightKg), "Weight must be greater than zero.");
        }

        return new MaxWeightRecord
        {
            Id = id ?? Guid.NewGuid(),
            Hand = hand,
            WeightKg = weightKg,
            RecordedAt = recordedAt ?? DateTime.UtcNow
        };
    }
}
