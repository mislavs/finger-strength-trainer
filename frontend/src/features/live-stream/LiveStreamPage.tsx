import { useMemo } from "react";

import { ForceChart } from "@/components/ForceChart";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { useLiveStream } from "@/features/live-stream/hooks";
import { LiveStats } from "@/features/live-stream/LiveStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LiveStreamPage() {
  const { status: deviceStatus, isReconnecting, reconnectionFailed } = useDeviceStatus();
  const { samples, stats, streamState, isBusy, error, start, stop } = useLiveStream();

  const primaryAction = useMemo(() => {
    if (streamState === "streaming") {
      return {
        label: "Stop Live Stream",
        onClick: () => void stop(),
      };
    }

    return {
      label: "Start Live Stream",
      onClick: () => void start(),
    };
  }, [start, stop, streamState]);

  const canStart = streamState !== "streaming";
  const isPrimaryDisabled = isBusy || (canStart && !deviceStatus.isConnected);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Live Stream</h1>
          <p className="text-sm text-muted-foreground">
            Stream live force data from your device.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {isReconnecting && streamState === "streaming" ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          BLE connection lost. Trying to reconnect before the live stream is stopped.
        </p>
      ) : null}

      {reconnectionFailed && streamState === "streaming" ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not reconnect to the device. The live stream has been stopped.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {streamState === "streaming" && (
        <>
          <LiveStats stats={stats} />

          <Card className="gap-4 py-4">
            <CardHeader className="px-4 pb-0">
              <CardTitle>Force Chart</CardTitle>
              <CardDescription>Rolling 10 second window of live force samples.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pt-0">
              <ForceChart samples={samples} windowSeconds={10} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
