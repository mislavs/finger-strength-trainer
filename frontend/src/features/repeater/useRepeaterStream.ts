import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ForceSamplePoint } from "@/components/ForceChart";
import { useSignalR } from "@/hooks/useSignalR";
import { ensureConnected } from "@/lib/signalr/ensureConnected";

interface RepeaterStreamStats {
  currentForceKg: number
  peakForceKg: number
}

interface UseRepeaterStreamResult {
  samples: ForceSamplePoint[]
  currentForceKg: number
  peakForceKg: number
  start: (options?: { reset?: boolean }) => Promise<void>
  stop: () => Promise<void>
  resetSamples: () => void
}

const defaultWindowSeconds = 10;
const initialStats: RepeaterStreamStats = {
  currentForceKg: 0,
  peakForceKg: 0,
};

function appendRollingSamples(
  current: ForceSamplePoint[],
  incoming: ForceSamplePoint[],
  windowSeconds: number,
): ForceSamplePoint[] {
  const merged = [...current, ...incoming];
  if (merged.length === 0) return merged;

  const cutoff = merged[merged.length - 1].timestampSeconds - windowSeconds;
  const firstVisible = merged.findIndex((s) => s.timestampSeconds >= cutoff);
  if (firstVisible <= 0) return merged;
  return merged.slice(firstVisible);
}

export function useRepeaterStream(): UseRepeaterStreamResult {
  const { connection } = useSignalR();
  const [samples, setSamples] = useState<ForceSamplePoint[]>([]);
  const [stats, setStats] = useState(initialStats);
  const isStreamingRef = useRef(false);
  const commandQueueRef = useRef<Promise<void>>(Promise.resolve());
  const timestampOffsetRef = useRef(0);
  const lastTimestampRef = useRef(0);

  const pendingSamplesRef = useRef<ForceSamplePoint[]>([]);
  const rafIdRef = useRef(0);

  const cancelPendingFrame = useCallback(() => {
    if (rafIdRef.current !== 0) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    pendingSamplesRef.current = [];
  }, []);

  const resetSamples = useCallback(() => {
    cancelPendingFrame();
    setSamples([]);
    setStats(initialStats);
    timestampOffsetRef.current = 0;
    lastTimestampRef.current = 0;
  }, [cancelPendingFrame]);

  const enqueueCommand = useCallback((command: () => Promise<void>) => {
    const nextCommand = commandQueueRef.current
      .catch(() => undefined)
      .then(command);

    commandQueueRef.current = nextCommand.catch(() => undefined);
    return nextCommand;
  }, []);

  useEffect(() => {
    const onForceSamples = (incomingSamples: ForceSamplePoint[]) => {
      if (!Array.isArray(incomingSamples) || incomingSamples.length === 0) {
        return;
      }

      pendingSamplesRef.current.push(...incomingSamples);

      if (rafIdRef.current === 0) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = 0;
          const pending = pendingSamplesRef.current;
          pendingSamplesRef.current = [];

          const adjustedSamples = pending.map((sample) => ({
            ...sample,
            timestampSeconds: sample.timestampSeconds + timestampOffsetRef.current,
          }));
          const latest = adjustedSamples[adjustedSamples.length - 1];
          lastTimestampRef.current = latest.timestampSeconds;

          setSamples((current) => appendRollingSamples(current, adjustedSamples, defaultWindowSeconds));
          setStats((currentStats) => {
            const incomingPeak = adjustedSamples.reduce(
              (peak, s) => Math.max(peak, s.weightKg), 0);

            return {
              currentForceKg: latest.weightKg,
              peakForceKg: Math.max(currentStats.peakForceKg, incomingPeak),
            };
          });
        });
      }
    };

    connection.on("ForceSamples", onForceSamples);

    return () => {
      connection.off("ForceSamples", onForceSamples);
      cancelPendingFrame();
    };
  }, [connection, cancelPendingFrame]);

  const start = useCallback(async (options?: { reset?: boolean }) => {
    await enqueueCommand(async () => {
      if (isStreamingRef.current) {
        return;
      }

      if (options?.reset ?? true) {
        resetSamples();
      } else if (lastTimestampRef.current > 0) {
        // The device timestamps restart from zero after measurement restarts,
        // so continue the chart from the previous visible timestamp.
        timestampOffsetRef.current = lastTimestampRef.current + 0.001;
      }

      try {
        await ensureConnected(connection);
        await connection.invoke("StartRepeaterStream");
        isStreamingRef.current = true;
      } catch {
        isStreamingRef.current = false;
      }
    });
  }, [connection, enqueueCommand, resetSamples]);

  const stop = useCallback(async () => {
    await enqueueCommand(async () => {
      if (!isStreamingRef.current) {
        return;
      }

      try {
        await ensureConnected(connection);
        await connection.invoke("StopRepeaterStream");
      } catch {
        // Repeater force streaming is best-effort support for the timer UI.
      } finally {
        isStreamingRef.current = false;
      }
    });
  }, [connection, enqueueCommand]);

  useEffect(() => {
    return () => {
      void enqueueCommand(async () => {
        if (!isStreamingRef.current) {
          return;
        }

        try {
          await connection.invoke("StopRepeaterStream");
        } catch {
          // Ignore cleanup failures during page unmount.
        } finally {
          isStreamingRef.current = false;
        }
      });
    };
  }, [connection, enqueueCommand]);

  return useMemo(
    () => ({
      samples,
      currentForceKg: stats.currentForceKg,
      peakForceKg: stats.peakForceKg,
      start,
      stop,
      resetSamples,
    }),
    [resetSamples, samples, start, stats.currentForceKg, stats.peakForceKg, stop],
  );
}
