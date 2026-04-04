namespace TindeqTrainer.Domain.Entities;

public class WorkoutProtocolItem
{
    private WorkoutProtocolItem()
    {
    }

    public Guid Id { get; private set; }

    public Guid WorkoutProtocolId { get; private set; }

    public Guid RepeaterProtocolId { get; private set; }

    public int SortOrder { get; private set; }

    public int Repetitions { get; private set; }

    public double RestAfterSeconds { get; private set; }

    public RepeaterProtocol RepeaterProtocol { get; private set; } = null!;

    public static WorkoutProtocolItem Create(
        Guid workoutProtocolId,
        Guid repeaterProtocolId,
        int repetitions,
        double restAfterSeconds,
        int sortOrder,
        Guid? id = null)
    {
        if (workoutProtocolId == Guid.Empty)
        {
            throw new ArgumentOutOfRangeException(nameof(workoutProtocolId), "Workout protocol id must not be empty.");
        }

        if (repeaterProtocolId == Guid.Empty)
        {
            throw new ArgumentOutOfRangeException(nameof(repeaterProtocolId), "Repeater protocol id must not be empty.");
        }

        if (repetitions <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(repetitions), "Repetitions must be greater than zero.");
        }

        if (restAfterSeconds < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(restAfterSeconds), "Rest after seconds must be non-negative.");
        }

        if (sortOrder < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(sortOrder), "Sort order must be non-negative.");
        }

        return new WorkoutProtocolItem
        {
            Id = id ?? Guid.NewGuid(),
            WorkoutProtocolId = workoutProtocolId,
            RepeaterProtocolId = repeaterProtocolId,
            Repetitions = repetitions,
            RestAfterSeconds = restAfterSeconds,
            SortOrder = sortOrder,
        };
    }
}
