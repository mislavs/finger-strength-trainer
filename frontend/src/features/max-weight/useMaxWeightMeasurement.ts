import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ForceSamplePoint } from "@/components/ForceChart";
import { useSignalR } from "@/hooks/useSignalR";
import type { MaxWeightHand } from "@/features/max-weight/models";
import { ensureConnected } from "@/lib/signalr/ensureConnected";
import { getSignalRConnectionErrorMessage, toHubErrorMessage } from "@/lib/signalr/hubErrorMessage";

interface UseMaxWeightMeasurementResult {
  currentForceKg: number
  leftPeakKg: number
  rightPeakKg: number
  activeHand: MaxWeightHand
  setActiveHand: (hand: MaxWeightHand) => void
  isStreaming: boolean
  isBusy: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => Promise<void>
  resetPeaks: () => void
}

type MeasurementCommand = "StartLiveStream" | "StopLiveStream"

function getPeakForce(samples: ForceSamplePoint[]): number {
  return samples.reduce((peak, sample) => Math.max(peak, sample.weightKg), 0);
}

export function useMaxWeightMeasurement(): UseMaxWeightMeasurementResult {
  const { connection } = useSignalR();
  const [currentForceKg, setCurrentForceKg] = useState(0);
  const [leftPeakKg, setLeftPeakKg] = useState(0);
  const [rightPeakKg, setRightPeakKg] = useState(0);
  const [activeHand, setActiveHandState] = useState<MaxWeightHand>("Left");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeCommand, setActiveCommand] = useState<MeasurementCommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeHandRef = useRef<MaxWeightHand>("Left");
  const isStreamingRef = useRef(false);

  const setStreamingState = useCallback((nextValue: boolean) => {
    isStreamingRef.current = nextValue;
    setIsStreaming(nextValue);
  }, []);

  const setActiveHand = useCallback((hand: MaxWeightHand) => {
    activeHandRef.current = hand;
    setActiveHandState(hand);
  }, []);

  useEffect(() => {
    const onForceSamples = (incomingSamples: ForceSamplePoint[]) => {
      if (!isStreamingRef.current || !Array.isArray(incomingSamples) || incomingSamples.length === 0) {
        return;
      }

      const latestSample = incomingSamples[incomingSamples.length - 1];
      const peakForceKg = getPeakForce(incomingSamples);
      setCurrentForceKg(latestSample.weightKg);
      setError(null);

      // Ignore force data from streams started elsewhere unless this page initiated the measurement.
      if (activeHandRef.current === "Left") {
        setLeftPeakKg((currentPeakKg) => Math.max(currentPeakKg, peakForceKg));
        return;
      }

      setRightPeakKg((currentPeakKg) => Math.max(currentPeakKg, peakForceKg));
    };

    const onLiveStreamStopped = () => {
      if (!isStreamingRef.current) {
        return;
      }

      setStreamingState(false);
      setCurrentForceKg(0);
      setError(null);
    };

    connection.on("ForceSamples", onForceSamples);
    connection.on("LiveStreamStopped", onLiveStreamStopped);

    return () => {
      connection.off("ForceSamples", onForceSamples);
      connection.off("LiveStreamStopped", onLiveStreamStopped);
    };
  }, [connection, setStreamingState]);

  const runCommand = useCallback(
    async (command: MeasurementCommand): Promise<boolean> => {
      setActiveCommand(command);
      setError(null);

      try {
        await ensureConnected(connection);
      } catch {
        setError(getSignalRConnectionErrorMessage());
        setActiveCommand(null);
        return false;
      }

      try {
        await connection.invoke(command);
        return true;
      } catch (commandError) {
        setError(toHubErrorMessage(commandError));
        return false;
      } finally {
        setActiveCommand(null);
      }
    },
    [connection],
  );

  const start = useCallback(async () => {
    setCurrentForceKg(0);

    const succeeded = await runCommand("StartLiveStream");
    if (!succeeded) {
      return;
    }

    setStreamingState(true);
  }, [runCommand, setStreamingState]);

  const stop = useCallback(async () => {
    const succeeded = await runCommand("StopLiveStream");
    if (!succeeded) {
      return;
    }

    setStreamingState(false);
    setCurrentForceKg(0);
  }, [runCommand, setStreamingState]);

  const resetPeaks = useCallback(() => {
    setCurrentForceKg(0);
    setLeftPeakKg(0);
    setRightPeakKg(0);
  }, []);

  return useMemo(
    () => ({
      currentForceKg,
      leftPeakKg,
      rightPeakKg,
      activeHand,
      setActiveHand,
      isStreaming,
      isBusy: activeCommand !== null,
      error,
      start,
      stop,
      resetPeaks,
    }),
    [
      activeCommand,
      activeHand,
      currentForceKg,
      error,
      isStreaming,
      leftPeakKg,
      resetPeaks,
      rightPeakKg,
      setActiveHand,
      start,
      stop,
    ],
  );
}
