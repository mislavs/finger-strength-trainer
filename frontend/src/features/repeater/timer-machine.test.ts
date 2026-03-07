import { TimerMachine } from "@/features/repeater/timer-machine";
import { TimerPhase, type TimerProtocol } from "@/features/repeater/models";

function createProtocol(overrides: Partial<TimerProtocol> = {}): TimerProtocol {
  return {
    repsPerSet: 3,
    numberOfSets: 2,
    workSeconds: 1,
    restSeconds: 1,
    handSwitchSeconds: 1,
    setRestSeconds: 2,
    countdownSeconds: 1,
    ...overrides,
  };
}

function tickSeconds(machine: TimerMachine, seconds: number) {
  return machine.tick(seconds * 1000);
}

function advanceToPhase(machine: TimerMachine, targetPhase: TimerPhase) {
  for (let step = 0; step < 20; step += 1) {
    const state = machine.getState();
    if (state.phase === targetPhase) {
      return state;
    }

    if (state.phase === TimerPhase.Idle || state.phase === TimerPhase.Done) {
      break;
    }

    machine.tick(state.remainingSeconds * 1000);
  }

  throw new Error(`Could not reach phase ${targetPhase}.`);
}

describe("TimerMachine", () => {
  it("runs a full multi-set cycle with reps, hand switch, set rest, and completion", () => {
    const machine = new TimerMachine(createProtocol());

    expect(machine.start("left")).toMatchObject({
      phase: TimerPhase.Countdown,
      currentSet: 1,
      currentRep: 1,
      currentHand: "left",
    });

    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Work, currentSet: 1, currentRep: 1, currentHand: "left" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Rest, currentSet: 1, currentRep: 1, currentHand: "left" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Work, currentSet: 1, currentRep: 2, currentHand: "left" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Rest, currentSet: 1, currentRep: 2, currentHand: "left" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Work, currentSet: 1, currentRep: 3, currentHand: "left" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.HandSwitch, currentSet: 1, currentRep: 1, currentHand: "right" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Work, currentSet: 1, currentRep: 1, currentHand: "right" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Rest, currentSet: 1, currentRep: 1, currentHand: "right" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Work, currentSet: 1, currentRep: 2, currentHand: "right" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Rest, currentSet: 1, currentRep: 2, currentHand: "right" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.Work, currentSet: 1, currentRep: 3, currentHand: "right" });
    expect(tickSeconds(machine, 1)).toMatchObject({ phase: TimerPhase.SetRest, currentSet: 2, currentRep: 1, currentHand: "left" });
    expect(tickSeconds(machine, 2)).toMatchObject({ phase: TimerPhase.Work, currentSet: 2, currentRep: 1, currentHand: "left" });

    tickSeconds(machine, 1);
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);

    expect(machine.getState()).toMatchObject({
      phase: TimerPhase.Done,
      currentSet: 2,
      currentRep: 3,
      currentHand: "right",
      remainingSeconds: 0,
    });
  });

  it("skips rest phases for a single-rep protocol and can start without a countdown", () => {
    const machine = new TimerMachine(
      createProtocol({
        repsPerSet: 1,
        numberOfSets: 1,
        countdownSeconds: 0,
      }),
    );

    expect(machine.start("left")).toMatchObject({
      phase: TimerPhase.Work,
      currentSet: 1,
      currentRep: 1,
      currentHand: "left",
    });

    expect(tickSeconds(machine, 1)).toMatchObject({
      phase: TimerPhase.HandSwitch,
      currentHand: "right",
      currentRep: 1,
    });
    expect(tickSeconds(machine, 1)).toMatchObject({
      phase: TimerPhase.Work,
      currentHand: "right",
      currentRep: 1,
    });
    expect(tickSeconds(machine, 1).phase).toBe(TimerPhase.Done);
  });

  it("skips a visible set rest phase when set rest duration is zero", () => {
    const callbacks = {
      onSetRestStart: vi.fn(),
      onSetRestComplete: vi.fn(),
    };
    const machine = new TimerMachine(
      createProtocol({
        repsPerSet: 1,
        numberOfSets: 2,
        countdownSeconds: 0,
        handSwitchSeconds: 0,
        setRestSeconds: 0,
      }),
      callbacks,
    );

    machine.start("left");
    tickSeconds(machine, 1);
    tickSeconds(machine, 0);

    expect(machine.getState()).toMatchObject({
      phase: TimerPhase.Work,
      currentSet: 1,
      currentRep: 1,
      currentHand: "right",
    });

    tickSeconds(machine, 1);

    expect(machine.getState()).toMatchObject({
      phase: TimerPhase.Work,
      currentSet: 2,
      currentRep: 1,
      currentHand: "left",
    });
    expect(callbacks.onSetRestStart).toHaveBeenCalledTimes(1);
    expect(callbacks.onSetRestComplete).toHaveBeenCalledTimes(1);
  });

  it.each([
    TimerPhase.Countdown,
    TimerPhase.Work,
    TimerPhase.Rest,
    TimerPhase.HandSwitch,
    TimerPhase.SetRest,
  ])("pauses and resumes correctly from %s", (phase) => {
    const machine = new TimerMachine(createProtocol({ repsPerSet: 2, numberOfSets: 2 }));
    machine.start("left");

    const activeState = advanceToPhase(machine, phase);
    const frozenRemainingSeconds = activeState.remainingSeconds;

    expect(machine.pause()).toMatchObject({
      phase: TimerPhase.Paused,
      remainingSeconds: frozenRemainingSeconds,
      currentSet: activeState.currentSet,
      currentRep: activeState.currentRep,
      currentHand: activeState.currentHand,
    });

    expect(machine.resume()).toMatchObject({
      phase: TimerPhase.Countdown,
      remainingSeconds: 3,
      currentSet: activeState.currentSet,
      currentRep: activeState.currentRep,
      currentHand: activeState.currentHand,
    });

    expect(tickSeconds(machine, 3)).toMatchObject({
      phase,
      remainingSeconds: frozenRemainingSeconds,
      currentSet: activeState.currentSet,
      currentRep: activeState.currentRep,
      currentHand: activeState.currentHand,
    });
  });

  it("skips the remaining hand switch countdown", () => {
    const machine = new TimerMachine(createProtocol({ repsPerSet: 1, numberOfSets: 1, countdownSeconds: 0, handSwitchSeconds: 10 }));

    machine.start("left");
    tickSeconds(machine, 1);

    expect(machine.getState()).toMatchObject({
      phase: TimerPhase.HandSwitch,
      currentHand: "right",
      currentRep: 1,
    });

    expect(machine.skipHandSwitch()).toMatchObject({
      phase: TimerPhase.Work,
      currentHand: "right",
      currentRep: 1,
    });
  });

  it("resets back to idle when stopped mid-session", () => {
    const machine = new TimerMachine(createProtocol());

    machine.start("right");
    tickSeconds(machine, 1);
    tickSeconds(machine, 1);

    expect(machine.getState().phase).toBe(TimerPhase.Rest);

    expect(machine.stop()).toEqual({
      phase: TimerPhase.Idle,
      remainingSeconds: 0,
      currentRep: 0,
      totalReps: 3,
      currentSet: 0,
      totalSets: 2,
      currentHand: "left",
      handLabel: "Left Hand",
    });
  });

  it("fires callbacks in the expected order across a complete session", () => {
    const events: string[] = [];
    const machine = new TimerMachine(
      createProtocol({
        repsPerSet: 2,
        numberOfSets: 2,
        countdownSeconds: 0,
      }),
      {
        onWorkStart: (set, rep, hand) => events.push(`work:${set}:${rep}:${hand}`),
        onRestStart: (set, rep, hand) => events.push(`rest:${set}:${rep}:${hand}`),
        onHandSwitch: () => events.push("hand-switch"),
        onSetRestStart: () => events.push("set-rest-start"),
        onSetRestComplete: () => events.push("set-rest-complete"),
        onComplete: () => events.push("complete"),
      },
    );

    machine.start("left");

    while (machine.getState().phase !== TimerPhase.Done) {
      const state = machine.getState();
      machine.tick(state.remainingSeconds * 1000);
    }

    expect(events).toEqual([
      "work:1:1:left",
      "rest:1:1:left",
      "work:1:2:left",
      "hand-switch",
      "work:1:1:right",
      "rest:1:1:right",
      "work:1:2:right",
      "set-rest-start",
      "set-rest-complete",
      "work:2:1:left",
      "rest:2:1:left",
      "work:2:2:left",
      "hand-switch",
      "work:2:1:right",
      "rest:2:1:right",
      "work:2:2:right",
      "complete",
    ]);
  });
});
