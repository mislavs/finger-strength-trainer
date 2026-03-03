namespace TindeqTrainer.Domain.Enums;

public enum TimerPhase
{
    Idle = 0,
    Countdown = 1,
    Work = 2,
    Rest = 3,
    HandSwitch = 4,
    Paused = 5,
    Done = 6
}
