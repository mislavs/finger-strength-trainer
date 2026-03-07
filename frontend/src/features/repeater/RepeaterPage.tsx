import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProtocol, useProtocols } from "@/features/protocols/hooks";
import type { Protocol } from "@/features/protocols/models";
import { TimerDisplay } from "@/features/repeater/TimerDisplay";
import { TimerPhase, type TimerHand, type TimerProtocol } from "@/features/repeater/models";
import { useTimer } from "@/features/repeater/useTimer";
import { appRoutes } from "@/lib/app-routes";

function toTimerProtocol(protocol: Protocol): TimerProtocol {
  return {
    repsPerSet: protocol.repsPerSet,
    numberOfSets: protocol.numberOfSets,
    workSeconds: protocol.workSeconds,
    restSeconds: protocol.restSeconds,
    handSwitchSeconds: protocol.handSwitchSeconds,
    setRestSeconds: protocol.setRestSeconds,
    countdownSeconds: protocol.countdownSeconds,
  };
}

function formatSeconds(seconds: number): string {
  return Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1);
}

function formatMinutes(seconds: number): string {
  const minutes = seconds / 60;
  return Number.isInteger(minutes) ? minutes.toFixed(0) : minutes.toFixed(1);
}

export function RepeaterPage() {
  const protocolsQuery = useProtocols();
  const [selectedProtocolId, setSelectedProtocolId] = useState("");
  const [startingHand, setStartingHand] = useState<TimerHand>("left");
  const timer = useTimer();
  const effectiveSelectedProtocolId = selectedProtocolId || protocolsQuery.data?.[0]?.id || "";

  const selectedProtocolQuery = useProtocol(effectiveSelectedProtocolId);
  const selectedProtocol = selectedProtocolQuery.data;
  const timerProtocol = selectedProtocol ? toTimerProtocol(selectedProtocol) : null;
  const hasSessionStarted = timer.state.phase !== TimerPhase.Idle;
  const canConfigure = timer.state.phase === TimerPhase.Idle;
  const isPaused = timer.state.phase === TimerPhase.Paused;
  const isSessionRunning = hasSessionStarted && timer.state.phase !== TimerPhase.Done;
  const isSessionComplete = timer.state.phase === TimerPhase.Done;

  const selectedProtocolSummary = useMemo(
    () => protocolsQuery.data?.find((protocol) => protocol.id === effectiveSelectedProtocolId) ?? null,
    [effectiveSelectedProtocolId, protocolsQuery.data],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Repeater</h1>
          <p className="text-sm text-muted-foreground">
            Frontend timer workflow for structured repeater training. BLE integration arrives in the next step.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canConfigure ? (
            <Button onClick={() => timerProtocol && timer.start(timerProtocol, startingHand)} disabled={!timerProtocol || selectedProtocolQuery.isLoading}>
              Start Timer
            </Button>
          ) : null}

          {isSessionRunning && !isPaused ? (
            <Button variant="outline" onClick={timer.pause}>
              Pause
            </Button>
          ) : null}

          {isPaused ? (
            <Button variant="outline" onClick={timer.resume}>
              Resume
            </Button>
          ) : null}

          {hasSessionStarted ? (
            <Button variant={isSessionRunning ? "destructive" : "outline"} onClick={timer.stop}>
              {isSessionRunning ? "Stop" : "Back to Setup"}
            </Button>
          ) : null}

          {timer.state.phase === TimerPhase.HandSwitch ? (
            <Button variant="secondary" onClick={timer.skipHandSwitch}>
              Skip Hand Switch
            </Button>
          ) : null}
        </div>
      </div>

      {!protocolsQuery.isLoading && !protocolsQuery.data?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No protocols yet</CardTitle>
            <CardDescription>Create a protocol before starting a repeater timer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={appRoutes.protocolsNew}>Create Protocol</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!hasSessionStarted ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Session Setup</CardTitle>
              <CardDescription>Choose a protocol and the hand you want to start with.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="protocol-select">
                  Protocol
                </label>
                {protocolsQuery.isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <select
                    id="protocol-select"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={effectiveSelectedProtocolId}
                    onChange={(event) => setSelectedProtocolId(event.target.value)}
                    disabled={!canConfigure}
                  >
                    {protocolsQuery.data?.map((protocol) => (
                      <option key={protocol.id} value={protocol.id}>
                        {protocol.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Starting Hand</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={startingHand === "left" ? "default" : "outline"}
                    onClick={() => setStartingHand("left")}
                    disabled={!canConfigure}
                  >
                    Left
                  </Button>
                  <Button
                    type="button"
                    variant={startingHand === "right" ? "default" : "outline"}
                    onClick={() => setStartingHand("right")}
                    disabled={!canConfigure}
                  >
                    Right
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedProtocolQuery.isLoading && effectiveSelectedProtocolId ? (
            <Skeleton className="h-52 w-full" />
          ) : null}

          {selectedProtocolQuery.isError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Failed to load the selected protocol.
            </p>
          ) : null}

          {selectedProtocol ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedProtocolSummary?.name ?? selectedProtocol.name}</CardTitle>
                <CardDescription>Protocol timing and set structure used by the timer machine.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Reps / Set</p>
                  <p className="text-xl font-semibold">{selectedProtocol.repsPerSet}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Number of Sets</p>
                  <p className="text-xl font-semibold">{selectedProtocol.numberOfSets}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Work / Rest</p>
                  <p className="text-xl font-semibold">
                    {formatSeconds(selectedProtocol.workSeconds)}s / {formatSeconds(selectedProtocol.restSeconds)}s
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Hand Switch</p>
                  <p className="text-xl font-semibold">{formatSeconds(selectedProtocol.handSwitchSeconds)}s</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Set Rest</p>
                  <p className="text-xl font-semibold">{formatMinutes(selectedProtocol.setRestSeconds)} min</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Countdown</p>
                  <p className="text-xl font-semibold">{formatSeconds(selectedProtocol.countdownSeconds)}s</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {hasSessionStarted ? <TimerDisplay state={timer.state} /> : null}

      {timer.state.phase === TimerPhase.HandSwitch ? (
        <p className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100">
          Set up {timer.state.handLabel.toLowerCase()} and continue when ready.
        </p>
      ) : null}

      {timer.state.phase === TimerPhase.SetRest ? (
        <p className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100">
          Recover between sets. The next work phase will start on {timer.state.handLabel.toLowerCase()}.
        </p>
      ) : null}

      {isSessionComplete ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          Repeater timer complete.
        </p>
      ) : null}
    </div>
  );
}
