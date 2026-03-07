import { useCallback, useEffect, useRef, useState } from "react";

import { createIdleTimerState, isTickingPhase, type TimerCallbacks, type TimerHand, type TimerProtocol } from "@/features/repeater/models";
import { TimerMachine } from "@/features/repeater/timer-machine";

const timerIntervalMs = 50;

export function useTimer(callbacks?: TimerCallbacks) {
  const callbacksRef = useRef(callbacks);
  const machineRef = useRef<TimerMachine | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number | null>(null);
  const [state, setState] = useState(() => createIdleTimerState());

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    lastTickAtRef.current = null;
  }, []);

  const syncState = useCallback((nextState: ReturnType<TimerMachine["getState"]>) => {
    setState(nextState);

    if (!isTickingPhase(nextState.phase)) {
      stopInterval();
    }
  }, [stopInterval]);

  const startInterval = useCallback(() => {
    stopInterval();
    lastTickAtRef.current = Date.now();

    intervalRef.current = window.setInterval(() => {
      const machine = machineRef.current;
      if (!machine) {
        stopInterval();
        return;
      }

      const now = Date.now();
      const lastTickAt = lastTickAtRef.current ?? now;
      lastTickAtRef.current = now;

      syncState(machine.tick(now - lastTickAt));
    }, timerIntervalMs);
  }, [stopInterval, syncState]);

  const start = useCallback((protocol: TimerProtocol, firstHand: TimerHand) => {
    const machine = new TimerMachine(protocol, callbacksRef.current);
    machineRef.current = machine;

    const nextState = machine.start(firstHand);
    syncState(nextState);

    if (isTickingPhase(nextState.phase)) {
      startInterval();
    }
  }, [startInterval, syncState]);

  const pause = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) {
      return;
    }

    syncState(machine.pause());
  }, [syncState]);

  const resume = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) {
      return;
    }

    const nextState = machine.resume();
    syncState(nextState);

    if (isTickingPhase(nextState.phase)) {
      startInterval();
    }
  }, [startInterval, syncState]);

  const stop = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) {
      return;
    }

    syncState(machine.stop());
  }, [syncState]);

  const skipHandSwitch = useCallback(() => {
    const machine = machineRef.current;
    if (!machine) {
      return;
    }

    const nextState = machine.skipHandSwitch();
    syncState(nextState);

    if (isTickingPhase(nextState.phase) && intervalRef.current === null) {
      startInterval();
    }
  }, [startInterval, syncState]);

  useEffect(() => stopInterval, [stopInterval]);

  return {
    state,
    start,
    pause,
    resume,
    stop,
    skipHandSwitch,
  };
}
