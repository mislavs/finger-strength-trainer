using TindeqTrainer.Domain.Enums;

namespace TindeqTrainer.Domain.ValueObjects;

public sealed record TimerState(
    TimerPhase Phase,
    TimerPhase PhasePausedFrom,
    double RemainingSeconds,
    int CurrentSet,
    int TotalSets,
    int CurrentHand,
    string HandLabel);
