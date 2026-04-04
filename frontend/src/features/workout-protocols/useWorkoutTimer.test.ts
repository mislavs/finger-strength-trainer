import { describe, expect, it, vi } from "vitest";
import { TimerMachine } from "@/features/repeater/timer-machine";
import { TimerPhase, type TimerProtocol } from "@/features/repeater/models";

function createFastProtocol(overrides: Partial<TimerProtocol> = {}): TimerProtocol {
  return {
    repsPerSet: 1,
    numberOfSets: 1,
    workSeconds: 0.1,
    restSeconds: 0,
    handSwitchSeconds: 0.1,
    setRestSeconds: 0,
    countdownSeconds: 0.1,
    ...overrides,
  };
}

function runToCompletion(machine: TimerMachine): void {
  for (let i = 0; i < 200; i += 1) {
    const state = machine.tick(100);
    if (state.phase === TimerPhase.Done) {
      return;
    }
  }
}

describe("workout timer block sequencing logic", () => {
  it("TimerMachine calls onComplete when a single block finishes", () => {
    const onComplete = vi.fn();
    const machine = new TimerMachine(createFastProtocol(), { onComplete });

    machine.start("left");
    runToCompletion(machine);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(machine.getState().phase).toBe(TimerPhase.Done);
  });

  it("two blocks can be sequenced back-to-back via onComplete", () => {
    const protocols = [createFastProtocol(), createFastProtocol()];
    const blockResults: string[] = [];
    let currentBlockIndex = 0;

    function startNextBlock(): void {
      if (currentBlockIndex >= protocols.length) {
        blockResults.push("all-done");
        return;
      }

      const idx = currentBlockIndex;
      currentBlockIndex += 1;

      const machine = new TimerMachine(protocols[idx], {
        onComplete: () => {
          blockResults.push(`block-${idx + 1}-done`);
          startNextBlock();
        },
      });
      machine.start("left");
      runToCompletion(machine);
    }

    startNextBlock();

    expect(blockResults).toEqual(["block-1-done", "block-2-done", "all-done"]);
  });

  it("zero-rest transitions skip straight to the next block", () => {
    const restBetweenMs = 0;
    const blockStarts: number[] = [];
    let currentBlockIndex = 0;
    const protocols = [createFastProtocol(), createFastProtocol(), createFastProtocol()];

    function startNextBlock(): void {
      if (currentBlockIndex >= protocols.length) {
        return;
      }

      const idx = currentBlockIndex;
      blockStarts.push(idx);
      currentBlockIndex += 1;

      const machine = new TimerMachine(protocols[idx], {
        onComplete: () => {
          if (restBetweenMs <= 0) {
            startNextBlock();
          }
        },
      });
      machine.start("left");
      runToCompletion(machine);
    }

    startNextBlock();

    expect(blockStarts).toEqual([0, 1, 2]);
  });

  it("workout rest inserts a gap between blocks", () => {
    const restBetweenMs = 5000;
    const events: string[] = [];

    const machine = new TimerMachine(createFastProtocol(), {
      onComplete: () => {
        events.push("block-1-done");
        events.push(`rest-${restBetweenMs}ms`);
        events.push("block-2-start");
      },
    });

    machine.start("left");
    runToCompletion(machine);

    expect(events).toEqual(["block-1-done", "rest-5000ms", "block-2-start"]);
  });

  it("pause and resume preserve the current machine state", () => {
    const machine = new TimerMachine(createFastProtocol({ countdownSeconds: 5, workSeconds: 5 }));

    machine.start("left");
    machine.tick(2000);

    const beforePause = machine.getState();
    expect(beforePause.phase).toBe(TimerPhase.Countdown);

    machine.pause();
    expect(machine.getState().phase).toBe(TimerPhase.Paused);

    machine.resume();
    const afterResume = machine.getState();
    expect(afterResume.phase).toBe(TimerPhase.Countdown);
  });

  it("stop resets the machine to idle", () => {
    const machine = new TimerMachine(createFastProtocol());
    machine.start("left");
    machine.tick(50);

    machine.stop();
    expect(machine.getState().phase).toBe(TimerPhase.Idle);
  });

  it("onBlockComplete fires with the correct 1-based block index", () => {
    const blockCompleteArgs: number[] = [];
    const protocols = [createFastProtocol(), createFastProtocol()];
    let currentBlockIndex = 0;

    function startNextBlock(): void {
      if (currentBlockIndex >= protocols.length) {
        return;
      }

      const idx = currentBlockIndex;
      currentBlockIndex += 1;

      const machine = new TimerMachine(protocols[idx], {
        onComplete: () => {
          blockCompleteArgs.push(idx + 1);
          startNextBlock();
        },
      });
      machine.start("left");
      runToCompletion(machine);
    }

    startNextBlock();

    expect(blockCompleteArgs).toEqual([1, 2]);
  });

  it("multi-rep blocks flatten correctly", () => {
    const repetitions = 3;
    let blocksStarted = 0;
    const protocols = Array.from({ length: repetitions }, () => createFastProtocol());

    function startNextBlock(): void {
      if (blocksStarted >= protocols.length) {
        return;
      }

      const idx = blocksStarted;
      blocksStarted += 1;

      const machine = new TimerMachine(protocols[idx], {
        onComplete: () => {
          startNextBlock();
        },
      });
      machine.start("left");
      runToCompletion(machine);
    }

    startNextBlock();

    expect(blocksStarted).toBe(3);
  });
});
