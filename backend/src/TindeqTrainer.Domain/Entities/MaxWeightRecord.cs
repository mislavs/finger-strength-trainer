namespace TindeqTrainer.Domain.Entities;

public class MaxWeightRecord
{
    private MaxWeightRecord()
    {
    }

    public Guid Id { get; private set; }

    public double? LeftWeightKg { get; private set; }

    public double? RightWeightKg { get; private set; }

    public DateTime RecordedAt { get; private set; }

    public static MaxWeightRecord Create(
        double? leftWeightKg,
        double? rightWeightKg,
        DateTime? recordedAt = null,
        Guid? id = null)
    {
        if (leftWeightKg is null && rightWeightKg is null)
        {
            throw new ArgumentException("At least one hand weight must be provided.");
        }

        if (leftWeightKg is <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(leftWeightKg), "Left weight must be greater than zero.");
        }

        if (rightWeightKg is <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(rightWeightKg), "Right weight must be greater than zero.");
        }

        return new MaxWeightRecord
        {
            Id = id ?? Guid.NewGuid(),
            LeftWeightKg = leftWeightKg,
            RightWeightKg = rightWeightKg,
            RecordedAt = recordedAt ?? DateTime.UtcNow
        };
    }
}
