import { useCallback, useEffect, useMemo, useState } from "react"

import type { ForceSamplePoint } from "@/components/ForceChart"
import { useSignalR } from "@/hooks/useSignalR"
import { ensureConnected } from "@/lib/signalr/ensureConnected"
import { getSignalRConnectionErrorMessage, toHubErrorMessage } from "@/lib/signalr/hubErrorMessage"

import type {
  LiveStatsSnapshot,
  LiveStreamState,
  LiveStreamStoppedStats,
} from "@/features/live-stream/models"

interface UseLiveStreamResult {
  samples: ForceSamplePoint[]
  stats: LiveStatsSnapshot
  stoppedStats: LiveStreamStoppedStats | null
  streamState: LiveStreamState
  isBusy: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => Promise<void>
  save: () => Promise<string | null>
  discard: () => Promise<void>
}

type LiveStreamCommand = "StartLiveStream" | "StopLiveStream" | "SaveLiveStream" | "DiscardLiveStream"

const maxRenderedSamples = 600
const initialStats: LiveStatsSnapshot = {
  currentForceKg: 0,
  peakForceKg: 0,
  durationSeconds: 0,
  avgForceKg: null,
}

function appendRollingSamples(current: ForceSamplePoint[], incoming: ForceSamplePoint[]): ForceSamplePoint[] {
  const merged = [...current, ...incoming]
  if (merged.length <= maxRenderedSamples) {
    return merged
  }

  return merged.slice(merged.length - maxRenderedSamples)
}

export function useLiveStream(): UseLiveStreamResult {
  const { connection } = useSignalR()
  const [samples, setSamples] = useState<ForceSamplePoint[]>([])
  const [stats, setStats] = useState<LiveStatsSnapshot>(initialStats)
  const [stoppedStats, setStoppedStats] = useState<LiveStreamStoppedStats | null>(null)
  const [streamState, setStreamState] = useState<LiveStreamState>("idle")
  const [activeCommand, setActiveCommand] = useState<LiveStreamCommand | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onForceSamples = (incomingSamples: ForceSamplePoint[]) => {
      if (!Array.isArray(incomingSamples) || incomingSamples.length === 0) {
        return
      }

      setStreamState("streaming")
      setError(null)
      setSamples((currentSamples) => appendRollingSamples(currentSamples, incomingSamples))
      setStats((currentStats) => {
        const latest = incomingSamples[incomingSamples.length - 1]
        const incomingPeak = incomingSamples.reduce((peak, sample) => Math.max(peak, sample.weightKg), 0)

        return {
          currentForceKg: latest.weightKg,
          peakForceKg: Math.max(currentStats.peakForceKg, incomingPeak),
          durationSeconds: Math.max(currentStats.durationSeconds, latest.timestampSeconds),
          avgForceKg: currentStats.avgForceKg,
        }
      })
    }

    const onLiveStreamStopped = (nextStats: LiveStreamStoppedStats) => {
      setStoppedStats(nextStats)
      setStats((currentStats) => ({
        currentForceKg: currentStats.currentForceKg,
        peakForceKg: nextStats.peakForceKg,
        durationSeconds: nextStats.durationSeconds,
        avgForceKg: nextStats.avgForceKg,
      }))
      setStreamState("stopped")
      setError(null)
    }

    connection.on("ForceSamples", onForceSamples)
    connection.on("LiveStreamStopped", onLiveStreamStopped)

    return () => {
      connection.off("ForceSamples", onForceSamples)
      connection.off("LiveStreamStopped", onLiveStreamStopped)
    }
  }, [connection])

  const runCommand = useCallback(
    async (command: LiveStreamCommand): Promise<boolean> => {
      setActiveCommand(command)
      setError(null)

      try {
        await ensureConnected(connection)
      } catch {
        setError(getSignalRConnectionErrorMessage())
        setActiveCommand(null)
        return false
      }

      try {
        await connection.invoke(command)
        return true
      } catch (commandError) {
        setError(toHubErrorMessage(commandError))
        return false
      } finally {
        setActiveCommand(null)
      }
    },
    [connection],
  )

  const runCommandWithResult = useCallback(
    async <TResult,>(command: LiveStreamCommand): Promise<TResult | null> => {
      setActiveCommand(command)
      setError(null)

      try {
        await ensureConnected(connection)
      } catch {
        setError(getSignalRConnectionErrorMessage())
        setActiveCommand(null)
        return null
      }

      try {
        return await connection.invoke<TResult>(command)
      } catch (commandError) {
        setError(toHubErrorMessage(commandError))
        return null
      } finally {
        setActiveCommand(null)
      }
    },
    [connection],
  )

  const start = useCallback(async () => {
    setSamples([])
    setStats(initialStats)
    setStoppedStats(null)

    const succeeded = await runCommand("StartLiveStream")
    if (!succeeded) {
      return
    }

    setStreamState("streaming")
  }, [runCommand])

  const stop = useCallback(async () => {
    const succeeded = await runCommand("StopLiveStream")
    if (!succeeded) {
      return
    }

    setStreamState("stopped")
  }, [runCommand])

  const save = useCallback(async (): Promise<string | null> => {
    const sessionId = await runCommandWithResult<string>("SaveLiveStream")
    if (!sessionId) {
      return null
    }

    setStreamState("idle")
    setSamples([])
    setStats(initialStats)
    setStoppedStats(null)
    return sessionId
  }, [runCommandWithResult])

  const discard = useCallback(async () => {
    const succeeded = await runCommand("DiscardLiveStream")
    if (!succeeded) {
      return
    }

    setStreamState("idle")
    setSamples([])
    setStats(initialStats)
    setStoppedStats(null)
  }, [runCommand])

  return useMemo(
    () => ({
      samples,
      stats,
      stoppedStats,
      streamState,
      isBusy: activeCommand !== null,
      error,
      start,
      stop,
      save,
      discard,
    }),
    [activeCommand, discard, error, samples, save, start, stats, stoppedStats, stop, streamState],
  )
}
