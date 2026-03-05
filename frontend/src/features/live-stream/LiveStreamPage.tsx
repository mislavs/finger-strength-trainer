import { useMemo } from "react"
import { toast } from "sonner"

import { ForceChart } from "@/components/ForceChart"
import { useDeviceStatus } from "@/hooks/useDeviceStatus"
import { useLiveStream } from "@/features/live-stream/hooks"
import { LiveStats } from "@/features/live-stream/LiveStats"
import { SaveDiscardDialog } from "@/features/live-stream/SaveDiscardDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const streamLabels = {
  idle: "Idle",
  streaming: "Streaming",
  stopped: "Stopped",
} as const

export function LiveStreamPage() {
  const { status: deviceStatus } = useDeviceStatus()
  const { samples, stats, stoppedStats, streamState, isBusy, error, start, stop, save, discard } = useLiveStream()

  const primaryAction = useMemo(() => {
    if (streamState === "streaming") {
      return {
        label: "Stop Live Stream",
        onClick: () => void stop(),
      }
    }

    return {
      label: "Start Live Stream",
      onClick: () => void start(),
    }
  }, [start, stop, streamState])

  const canStart = streamState !== "streaming"
  const isPrimaryDisabled = isBusy || (canStart && !deviceStatus.isConnected)

  const handleSave = async () => {
    const sessionId = await save()
    if (sessionId) {
      toast.success("Live stream saved.")
    }
  }

  const handleDiscard = async () => {
    await discard()
    toast.success("Live stream discarded.")
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Live Stream</h1>
          <p className="text-sm text-muted-foreground">
            Free-form force monitoring with real-time charting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">State: {streamLabels[streamState]}</span>
          <Button onClick={primaryAction.onClick} disabled={isPrimaryDisabled}>
            {isBusy ? "Working..." : primaryAction.label}
          </Button>
        </div>
      </div>

      {!deviceStatus.isConnected && streamState !== "streaming" ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Connect to a device before starting a live stream.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <LiveStats stats={stats} />

      <Card className="gap-4 py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle>Force Chart</CardTitle>
          <CardDescription>Rolling 30 second window of live force samples.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pt-0">
          <ForceChart samples={samples} />
        </CardContent>
      </Card>

      <SaveDiscardDialog
        open={streamState === "stopped"}
        stats={stoppedStats}
        isBusy={isBusy}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  )
}
