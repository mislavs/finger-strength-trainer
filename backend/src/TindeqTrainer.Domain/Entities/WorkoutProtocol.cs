namespace TindeqTrainer.Domain.Entities;

public class WorkoutProtocol
{
    private readonly List<WorkoutProtocolItem> _items = [];

    private WorkoutProtocol()
    {
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public IReadOnlyList<WorkoutProtocolItem> Items => _items;

    public static WorkoutProtocol Create(
        string name,
        IEnumerable<(Guid RepeaterProtocolId, int Repetitions, double RestAfterSeconds)> items,
        Guid? id = null)
    {
        var protocol = new WorkoutProtocol
        {
            Id = id ?? Guid.NewGuid(),
            Name = ValidateAndNormalize(name),
        };

        protocol.ReplaceItems(items);
        return protocol;
    }

    public void UpdateDetails(string name)
    {
        Name = ValidateAndNormalize(name);
    }

    private void ReplaceItems(IEnumerable<(Guid RepeaterProtocolId, int Repetitions, double RestAfterSeconds)> items)
    {
        ArgumentNullException.ThrowIfNull(items);

        var itemList = items.ToList();
        if (itemList.Count == 0)
        {
            throw new ArgumentOutOfRangeException(nameof(items), "Workout protocol must contain at least one item.");
        }

        _items.Clear();

        for (var index = 0; index < itemList.Count; index += 1)
        {
            var item = itemList[index];
            _items.Add(WorkoutProtocolItem.Create(
                workoutProtocolId: Id,
                repeaterProtocolId: item.RepeaterProtocolId,
                repetitions: item.Repetitions,
                restAfterSeconds: item.RestAfterSeconds,
                sortOrder: index));
        }
    }

    private static string ValidateAndNormalize(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return name.Trim();
    }
}
