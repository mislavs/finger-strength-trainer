import { useCallback, useEffect, useRef, useState } from "react";

import {
  createIdleTimerState,
  isTickingPhase,
  TimerPhase,
  type TimerCallbacks,
  type TimerHand,
  type TimerProtocol,
  type TimerState,
} from "@/features/repeater/models";
import { TimerMachine } from "@/features/repeater/timer-machine";

const timerIntervalMs = 50;

export interface WorkoutBlock {
  name: string
  timerProtocol: TimerProtocol
  weightPercentage: number
  audioCues: boolean
  countdownBeeps: boolean
  restAfterSeconds: number
}

type WorkoutTimerMode = "idle" | "block" | "workout-rest" | "workout-rest-paused" | "done";

export interface WorkoutTimerCallbacks extends TimerCallbacks {
  onBlockComplete?: (blockIndex: number) => void
  onWorkoutRestStart?: (nextBlockIndex: number) => void
}

export interface WorkoutTimerState {
  mode: WorkoutTimerMode
  timerState: TimerState
  currentBlockIndex: number
  totalBlocks: number
  currentBlock: WorkoutBlock | null
  nextBlock: WorkoutBlock | null
  workoutRestRemainingSeconds: number
  isPaused: boolean
  isWorkoutRest: boolean
  isRunning: boolean
  isComplete: boolean
}

interface UseWorkoutTimerOptions {
  blocks: WorkoutBlock[]
  callbacks?: WorkoutTimerCallbacks
}

function toSeconds(milliseconds: number): number {
  return Math.max(0, milliseconds) / 1000;
}

export function useWorkoutTimer({ blocks, callbacks }: UseWorkoutTimerOptions) {
  const blocksRef = useRef(blocks);
  const callbacksRef = useRef(callbacks);
  const machineRef = useRef<TimerMachine | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);
  const modeRef = useRef<WorkoutTimerMode>("idle");
  const blockIndexRef = useRef(0);
  const startingHandRef = useRef<TimerHand>("left");
  const timerStateRef = useRef(createIdleTimerState());
  const workoutRestRemainingMsRef = useRef(0);
  const startBlockRef = useRef<(index: number) => void>(() => {});
  const [state, setState] = useState<WorkoutTimerState>(() => ({
    mode: "idle",
    timerState: createIdleTimerState(),
    currentBlockIndex: 0,
    totalBlocks: blocks.length,
    currentBlock: null,
    nextBlock: null,
    workoutRestRemainingSeconds: 0,
    isPaused: false,
    isWorkoutRest: false,
    isRunning: false,
    isComplete: false,
  }));

  const syncState = useCallback(() => {
    const currentBlock = blocksRef.current[blockIndexRef.current] ?? null;
    const nextBlock = modeRef.current === "workout-rest" || modeRef.current === "workout-rest-paused"
      ? currentBlock
      : blocksRef.current[blockIndexRef.current + 1] ?? null;

    setState({
      mode: modeRef.current,
      timerState: timerStateRef.current,
      currentBlockIndex: currentBlock ? blockIndexRef.current + 1 : 0,
      totalBlocks: blocksRef.current.length,
      currentBlock,
      nextBlock,
      workoutRestRemainingSeconds: toSeconds(workoutRestRemainingMsRef.current),
      isPaused: timerStateRef.current.phase === TimerPhase.Paused || modeRef.current === "workout-rest-paused",
      isWorkoutRest: modeRef.current === "workout-rest" || modeRef.current === "workout-rest-paused",
      isRunning: modeRef.current !== "idle" && modeRef.current !== "done",
      isComplete: modeRef.current === "done",
    });
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    lastTickAtRef.current = null;
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();
    lastTickAtRef.current = Date.now();

    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const lastTickAt = lastTickAtRef.current ?? now;
      lastTickAtRef.current = now;
      const elapsedMs = now - lastTickAt;

      if (modeRef.current === "block" && machineRef.current) {
        timerStateRef.current = machineRef.current.tick(elapsedMs);
        syncState();

        if (!isTickingPhase(timerStateRef.current.phase) && modeRef.current === "block") {
          stopInterval();
        }

        return;
      }

      if (modeRef.current === "workout-rest") {
        workoutRestRemainingMsRef.current = Math.max(0, workoutRestRemainingMsRef.current - elapsedMs);

        if (workoutRestRemainingMsRef.current <= 0) {
          const nextIndex = blockIndexRef.current;
          if (nextIndex < blocksRef.current.length) {
            startBlockRef.current(nextIndex);
            return;
          }

          modeRef.current = "done";
        }

        syncState();
      }
    }, timerIntervalMs);
  }, [stopInterval, syncState]);

  startBlockRef.current = (index: number) => {
    const block = blocksRef.current[index];
    if (!block) {
      modeRef.current = "done";
      timerStateRef.current = createIdleTimerState();
      machineRef.current = null;
      syncState();
      return;
    }

    blockIndexRef.current = index;
    modeRef.current = "block";

    const machine = new TimerMachine(block.timerProtocol, {
      onWorkStart: (set, rep, hand) => callbacksRef.current?.onWorkStart?.(set, rep, hand),
      onRestStart: (set, rep, hand) => callbacksRef.current?.onRestStart?.(set, rep, hand),
      onHandSwitch: () => callbacksRef.current?.onHandSwitch?.(),
      onSetRestStart: () => callbacksRef.current?.onSetRestStart?.(),
      onSetRestComplete: () => callbacksRef.current?.onSetRestComplete?.(),
      onComplete: () => {
        callbacksRef.current?.onBlockComplete?.(index + 1);

        const nextIndex = index + 1;
        if (nextIndex >= blocksRef.current.length) {
          modeRef.current = "done";
          callbacksRef.current?.onComplete?.();
          return;
        }

        const restAfterMs = Math.max(0, Math.round((block.restAfterSeconds ?? 0) * 1000));
        if (restAfterMs <= 0) {
          startBlockRef.current(nextIndex);
          return;
        }

        machineRef.current = null;
        modeRef.current = "workout-rest";
        blockIndexRef.current = nextIndex;
        workoutRestRemainingMsRef.current = restAfterMs;
        callbacksRef.current?.onWorkoutRestStart?.(nextIndex + 1);
      },
    });

    machineRef.current = machine;
    timerStateRef.current = machine.start(startingHandRef.current);
    syncState();

    if (isTickingPhase(timerStateRef.current.phase)) {
      startInterval();
    }
  };

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    blocksRef.current = blocks;
    syncState();
  }, [blocks, syncState]);

  const start = useCallback((firstHand: TimerHand) => {
    startingHandRef.current = firstHand;
    workoutRestRemainingMsRef.current = 0;
    timerStateRef.current = createIdleTimerState();
    machineRef.current = null;
    modeRef.current = "idle";

    if (!blocksRef.current.length) {
      syncState();
      return;
    }

    startBlockRef.current(0);
  }, [syncState]);

  const pause = useCallback(() => {
    if (modeRef.current === "block" && machineRef.current) {
      timerStateRef.current = machineRef.current.pause();
      syncState();
      stopInterval();
      return;
    }

    if (modeRef.current === "workout-rest") {
      modeRef.current = "workout-rest-paused";
      syncState();
      stopInterval();
    }
  }, [stopInterval, syncState]);

  const resume = useCallback(() => {
    if (timerStateRef.current.phase === TimerPhase.Paused && machineRef.current) {
      timerStateRef.current = machineRef.current.resume();
      syncState();

      if (isTickingPhase(timerStateRef.current.phase)) {
        startInterval();
      }

      return;
    }

    if (modeRef.current === "workout-rest-paused") {
      modeRef.current = "workout-rest";
      syncState();
      startInterval();
    }
  }, [startInterval, syncState]);

  const stop = useCallback(() => {
    stopInterval();
    machineRef.current = null;
    modeRef.current = "idle";
    blockIndexRef.current = 0;
    workoutRestRemainingMsRef.current = 0;
    timerStateRef.current = createIdleTimerState();
    syncState();
  }, [stopInterval, syncState]);

  useEffect(() => stopInterval, [stopInterval]);

  return {
    state,
    start,
    pause,
    resume,
    stop,
  };
}
