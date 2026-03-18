import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ApiClientError } from "@/lib/api-client";
import { ForceChart } from "@/components/ForceChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentMaxWeights } from "@/features/max-weight/hooks";
import { DeleteProtocolDialog } from "@/features/protocols/DeleteProtocolDialog";
import { ProtocolFieldError, ProtocolNumberField, getProtocolFieldErrorMessage } from "@/features/protocols/ProtocolFieldControls";
import { protocolNumericFields } from "@/features/protocols/protocol-form.constants";
import { useProtocol, useProtocols, useUpdateProtocol } from "@/features/protocols/hooks";
import { protocolFieldNames, toProtocolInput, type Protocol, type ProtocolInput, type ProtocolSummary } from "@/features/protocols/models";
import { ProtocolFlowFields } from "@/features/protocols/ProtocolFlowFields";
import { protocolSchema, type ProtocolFormValues } from "@/features/protocols/schema";
import { TimerDisplay } from "@/features/repeater/TimerDisplay";
import { TimerPhase, type TimerHand, type TimerProtocol } from "@/features/repeater/models";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { useAudioCues } from "@/features/repeater/useAudioCues";
import { useRepeaterStream } from "@/features/repeater/useRepeaterStream";
import { useTimer } from "@/features/repeater/useTimer";
import { appRoutes } from "@/lib/app-routes";

const secondsPerMinute = 60;

function toNonNegativeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function computeTargetWeightKg(maxWeightKg: number, weightPercentage: number): number {
  return maxWeightKg * (weightPercentage / 100);
}

function shouldShowRepeaterForceChart(phase: TimerPhase): boolean {
  return phase === TimerPhase.Countdown
    || phase === TimerPhase.Work
    || phase === TimerPhase.Rest
    || phase === TimerPhase.Paused;
}

function shouldRestartRepeaterForceStream(phase: TimerPhase): boolean {
  return phase === TimerPhase.Countdown
    || phase === TimerPhase.Work
    || phase === TimerPhase.Rest;
}

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

export function RepeaterPage() {
  const protocolsQuery = useProtocols();
  const updateProtocol = useUpdateProtocol();
  const currentMaxWeightsQuery = useCurrentMaxWeights();
  const { status: deviceStatus, isReconnecting, reconnectionFailed } = useDeviceStatus();
  const [selectedProtocolId, setSelectedProtocolId] = useState("");
  const [protocolToDelete, setProtocolToDelete] = useState<ProtocolSummary | null>(null);
  const [startWarningOpen, setStartWarningOpen] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [stopDialogPausedTimer, setStopDialogPausedTimer] = useState(false);
  const [connectionFailureDialogOpen, setConnectionFailureDialogOpen] = useState(false);
  const [startingHand, setStartingHand] = useState<TimerHand>("left");
  const [sessionLeftMaxWeightKg, setSessionLeftMaxWeightKg] = useState<number | undefined>(undefined);
  const [sessionRightMaxWeightKg, setSessionRightMaxWeightKg] = useState<number | undefined>(undefined);
  const reconnectPausedTimerRef = useRef(false);
  const pausedFromPhaseRef = useRef<TimerPhase | null>(null);
  const repeaterStream = useRepeaterStream();
  const timer = useTimer({
    onWorkStart: (_set, rep) => {
      if (rep === 1 && deviceStatus.isConnected) {
        void repeaterStream.start();
      }
    },
    onHandSwitch: () => {
      void repeaterStream.stop();
      repeaterStream.resetSamples();
    },
    onSetRestStart: () => {
      void repeaterStream.stop();
      repeaterStream.resetSamples();
    },
    onComplete: () => {
      void repeaterStream.stop();
    },
  });
  const form = useForm<ProtocolFormValues>({
    resolver: zodResolver(protocolSchema),
    defaultValues: {
      name: "",
      weightPercentage: 0,
      repsPerSet: 1,
      numberOfSets: 1,
      workSeconds: 0,
      restSeconds: 0,
      handSwitchSeconds: 0,
      setRestSeconds: 0,
      countdownSeconds: 0,
      audioCues: true,
      countdownBeeps: true,
    },
  });
  const weightPercentage = useWatch({
    control: form.control,
    name: "weightPercentage",
  });
  const leftReferenceMaxWeightKg = toNonNegativeNumber(sessionLeftMaxWeightKg ?? currentMaxWeightsQuery.data?.leftKg);
  const rightReferenceMaxWeightKg = toNonNegativeNumber(sessionRightMaxWeightKg ?? currentMaxWeightsQuery.data?.rightKg);
  const leftTargetWeightKg = computeTargetWeightKg(leftReferenceMaxWeightKg, toNonNegativeNumber(weightPercentage));
  const rightTargetWeightKg = computeTargetWeightKg(rightReferenceMaxWeightKg, toNonNegativeNumber(weightPercentage));
  const effectiveSelectedProtocolId = useMemo(() => {
    const protocols = protocolsQuery.data ?? [];

    if (!protocols.length) {
      return "";
    }

    if (selectedProtocolId && protocols.some((protocol) => protocol.id === selectedProtocolId)) {
      return selectedProtocolId;
    }

    return protocols[0].id;
  }, [protocolsQuery.data, selectedProtocolId]);

  const selectedProtocolQuery = useProtocol(effectiveSelectedProtocolId);
  const selectedProtocol = selectedProtocolQuery.data;
  const timerProtocol = selectedProtocol ? toTimerProtocol(selectedProtocol) : null;
  const { resumeAudioContext } = useAudioCues(timer.state, {
    audioCues: selectedProtocol?.audioCues ?? false,
    countdownBeeps: selectedProtocol?.countdownBeeps ?? false,
  });
  const hasSessionStarted = timer.state.phase !== TimerPhase.Idle;
  const canConfigure = timer.state.phase === TimerPhase.Idle;
  const isPaused = timer.state.phase === TimerPhase.Paused;
  const isSessionRunning = hasSessionStarted && timer.state.phase !== TimerPhase.Done;
  const requiresStopConfirmation = hasSessionStarted && timer.state.phase !== TimerPhase.Done;
  const isSavingProtocol = updateProtocol.isPending;
  const hasForceSamples = repeaterStream.samples.length > 0;
  const showForceChart = hasSessionStarted
    && shouldShowRepeaterForceChart(timer.state.phase)
    && (deviceStatus.isConnected || hasForceSamples);
  const isWorkPhase = timer.state.phase === TimerPhase.Work;
  const activeHandReferenceMaxWeightKg = timer.state.currentHand === "right"
    ? rightReferenceMaxWeightKg
    : leftReferenceMaxWeightKg;
  const targetForceKg = isWorkPhase && selectedProtocol
    ? computeTargetWeightKg(activeHandReferenceMaxWeightKg, selectedProtocol.weightPercentage)
    : undefined;

  const selectedProtocolSummary = useMemo(
    () => protocolsQuery.data?.find((protocol) => protocol.id === effectiveSelectedProtocolId) ?? null,
    [effectiveSelectedProtocolId, protocolsQuery.data],
  );
  const hasProtocols = Boolean(protocolsQuery.data?.length);

  const closeDeleteDialog = () => setProtocolToDelete(null);
  const handleDeleteDialogChange = (open: boolean) => {
    if (!open) {
      closeDeleteDialog();
    }
  };
  const canStartTimer =
    Boolean(timerProtocol) &&
    !selectedProtocolQuery.isLoading &&
    !form.formState.isDirty &&
    !isSavingProtocol;

  const handlePause = useCallback((): void => {
    pausedFromPhaseRef.current = timer.state.phase;

    if (shouldRestartRepeaterForceStream(timer.state.phase)) {
      void repeaterStream.stop();
    }

    timer.pause();
  }, [repeaterStream, timer]);

  const handleResume = useCallback((): void => {
    const pausedFromPhase = pausedFromPhaseRef.current;
    pausedFromPhaseRef.current = null;

    if (deviceStatus.isConnected && pausedFromPhase && shouldRestartRepeaterForceStream(pausedFromPhase)) {
      void repeaterStream.start({ reset: false });
    }

    timer.resume();
  }, [deviceStatus.isConnected, repeaterStream, timer]);

  useEffect(() => {
    if (!selectedProtocol) {
      return;
    }

    form.reset(toProtocolInput(selectedProtocol));
  }, [form, selectedProtocol]);

  useEffect(() => {
    if (!isReconnecting || !hasSessionStarted || timer.state.phase === TimerPhase.Done || timer.state.phase === TimerPhase.Paused) {
      return;
    }

    reconnectPausedTimerRef.current = true;
    handlePause();
    toast.error("BLE connection lost. Pausing the repeater timer while the app reconnects.");
  }, [handlePause, hasSessionStarted, isReconnecting, timer.state.phase]);

  useEffect(() => {
    if (!reconnectPausedTimerRef.current || !reconnectionFailed || !hasSessionStarted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setConnectionFailureDialogOpen(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hasSessionStarted, reconnectionFailed]);

  useEffect(() => {
    if (!reconnectPausedTimerRef.current) {
      return;
    }

    if (!deviceStatus.isConnected || isReconnecting || stopDialogOpen || timer.state.phase !== TimerPhase.Paused) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      reconnectPausedTimerRef.current = false;
      setConnectionFailureDialogOpen(false);
      handleResume();
      toast.success("BLE reconnected. Resuming the repeater timer.");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [deviceStatus.isConnected, handleResume, isReconnecting, stopDialogOpen, timer.state.phase]);

  async function handleProtocolSave(values: ProtocolFormValues): Promise<void> {
    if (!selectedProtocol) {
      return;
    }

    const request: ProtocolInput = {
      ...toProtocolInput(selectedProtocol),
      ...values,
      setRestSeconds: values.setRestSeconds * secondsPerMinute,
    };

    try {
      await updateProtocol.mutateAsync({ id: selectedProtocol.id, data: request });
      form.reset({
        ...values,
        setRestSeconds: values.setRestSeconds,
      });
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        toast.error("Failed to save protocol.");
        return;
      }

      if (error.errors) {
        for (const [fieldName, messages] of Object.entries(error.errors)) {
          if (!protocolFieldNames.includes(fieldName as keyof ProtocolInput)) {
            continue;
          }

          form.setError(fieldName as keyof ProtocolFormValues, {
            type: "server",
            message: messages[0],
          });
        }
      }

      toast.error(error.message);
    }
  }

  function startTimer(): void {
    if (!timerProtocol) {
      return;
    }

    resumeAudioContext();
    clearReconnectPauseTracking();
    pausedFromPhaseRef.current = null;
    repeaterStream.resetSamples();
    if (deviceStatus.isConnected) {
      void repeaterStream.start();
    }
    timer.start(timerProtocol, startingHand);
  }

  function handleStartTimer(): void {
    if (!deviceStatus.isConnected) {
      setStartWarningOpen(true);
      return;
    }

    startTimer();
  }

  function handleStartWithoutDevice(): void {
    setStartWarningOpen(false);
    startTimer();
  }

  function handleStopAction(): void {
    if (!requiresStopConfirmation) {
      pausedFromPhaseRef.current = null;
      void repeaterStream.stop();
      repeaterStream.resetSamples();
      timer.stop();
      return;
    }

    if (!isPaused) {
      handlePause();
      setStopDialogPausedTimer(true);
    } else {
      setStopDialogPausedTimer(false);
    }

    setStopDialogOpen(true);
  }

  function handleStopDialogChange(open: boolean): void {
    setStopDialogOpen(open);

    if (!open && stopDialogPausedTimer && timer.state.phase === TimerPhase.Paused) {
      handleResume();
    }

    if (!open) {
      setStopDialogPausedTimer(false);
    }
  }

  function handleStopConfirm(): void {
    clearReconnectPauseTracking();
    pausedFromPhaseRef.current = null;
    void repeaterStream.stop();
    repeaterStream.resetSamples();
    timer.stop();
    setStopDialogPausedTimer(false);
    setStopDialogOpen(false);
  }

  function clearReconnectPauseTracking(): void {
    reconnectPausedTimerRef.current = false;
    setConnectionFailureDialogOpen(false);
  }

  function handleKeepPausedAfterReconnectFailure(): void {
    clearReconnectPauseTracking();
  }

  function handleAbortAfterReconnectFailure(): void {
    clearReconnectPauseTracking();
    pausedFromPhaseRef.current = null;
    void repeaterStream.stop();
    repeaterStream.resetSamples();
    timer.stop();
    toast.error("Repeater session aborted after the BLE reconnect window expired.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Repeaters</h1>
          <p className="text-sm text-muted-foreground">
            Set up repeater sessions and manage the protocols they run with from one page.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canConfigure ? (
            <Button onClick={handleStartTimer} disabled={!canStartTimer}>
              Start Timer
            </Button>
          ) : null}

          {isSessionRunning && !isPaused ? (
            <Button variant="outline" onClick={handlePause}>
              Pause
            </Button>
          ) : null}

          {isPaused ? (
            <Button variant="outline" onClick={handleResume}>
              Resume
            </Button>
          ) : null}

          {hasSessionStarted ? (
            <Button variant={isSessionRunning ? "destructive" : "outline"} onClick={handleStopAction}>
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

      {!protocolsQuery.isLoading && !hasProtocols ? (
        <Card>
          <CardHeader>
            <CardTitle>No protocols yet</CardTitle>
            <CardDescription>Create your first protocol to configure a repeater session.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={appRoutes.protocolsNew}>
                <Plus className="size-4" />
                New Protocol
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!hasSessionStarted && (protocolsQuery.isLoading || hasProtocols) ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Session Setup</CardTitle>
              <CardDescription>Choose a protocol and the hand you want to start with.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-end gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
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

                  <div className="flex shrink-0 gap-2">
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link to={appRoutes.protocolsNew}>
                        <Plus className="size-4" />
                        New
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={!selectedProtocolSummary}
                      onClick={() => selectedProtocolSummary && setProtocolToDelete(selectedProtocolSummary)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Starting Hand</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={startingHand === "left" ? "default" : "outline"}
                      onClick={() => setStartingHand("left")}
                      disabled={!canConfigure}
                      size="sm"
                    >
                      Left
                    </Button>
                    <Button
                      type="button"
                      variant={startingHand === "right" ? "default" : "outline"}
                      onClick={() => setStartingHand("right")}
                      disabled={!canConfigure}
                      size="sm"
                    >
                      Right
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-left-max-weight">Left Max (kg)</Label>
                  <Input
                    id="session-left-max-weight"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={String(toNonNegativeNumber(currentMaxWeightsQuery.data?.leftKg))}
                    value={sessionLeftMaxWeightKg ?? ""}
                    onChange={(event) => {
                      const raw = event.target.valueAsNumber;
                      setSessionLeftMaxWeightKg(Number.isFinite(raw) ? toNonNegativeNumber(raw) : undefined);
                    }}
                    disabled={!canConfigure}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-right-max-weight">Right Max (kg)</Label>
                  <Input
                    id="session-right-max-weight"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={String(toNonNegativeNumber(currentMaxWeightsQuery.data?.rightKg))}
                    value={sessionRightMaxWeightKg ?? ""}
                    onChange={(event) => {
                      const raw = event.target.valueAsNumber;
                      setSessionRightMaxWeightKg(Number.isFinite(raw) ? toNonNegativeNumber(raw) : undefined);
                    }}
                    disabled={!canConfigure}
                  />
                </div>
              </div>

              {currentMaxWeightsQuery.isError ? (
                <p className="text-sm text-destructive">
                  Failed to load the latest recorded max weights. You can still override them manually here.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {selectedProtocolQuery.isLoading && effectiveSelectedProtocolId ? (
            <Skeleton className="h-52 w-full" />
          ) : null}

          {protocolsQuery.isError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Failed to load protocols. Please try again.
            </p>
          ) : null}

          {selectedProtocolQuery.isError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Failed to load the selected protocol.
            </p>
          ) : null}

          {selectedProtocol ? (
            <Card>
              <CardContent>
                <form className="space-y-4" onSubmit={form.handleSubmit(handleProtocolSave)}>
                  <div className="space-y-2">
                    <Label htmlFor="protocol-name">Name</Label>
                    <Input
                      id="protocol-name"
                      disabled={!canConfigure || isSavingProtocol}
                      {...form.register("name")}
                    />
                    <ProtocolFieldError message={getProtocolFieldErrorMessage(form.formState.errors.name?.message)} />
                  </div>

                  <section className="space-y-3">
                    <h2 className="font-medium">Load</h2>
                    <ProtocolNumberField
                      form={form}
                      field={protocolNumericFields.weightPercentage}
                      disabled={!canConfigure || isSavingProtocol}
                      description="Percent of your current per-hand max weight."
                    />
                    <p className="text-sm text-muted-foreground">
                      Target Weight: {leftTargetWeightKg.toFixed(1)} kg left / {rightTargetWeightKg.toFixed(1)} kg right
                    </p>
                  </section>

                  <ProtocolFlowFields form={form} disabled={!canConfigure || isSavingProtocol} />

                  <div className="flex flex-wrap justify-end gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!form.formState.isDirty || isSavingProtocol}
                        onClick={() => form.reset(toProtocolInput(selectedProtocol))}
                      >
                        Reset
                      </Button>
                      <Button type="submit" disabled={!canConfigure || !form.formState.isDirty || isSavingProtocol}>
                        {isSavingProtocol ? <Loader2 className="size-4 animate-spin" /> : null}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {hasSessionStarted ? <TimerDisplay state={timer.state} /> : null}

      {showForceChart ? (
        <Card className="gap-4 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>Live Force Stream</CardTitle>
            <CardDescription>
              {isPaused
                ? "Live force stream paused. The chart remains visible until you resume."
                : "Real-time Tindeq force data for the current repeater hand."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pt-0">
            {isWorkPhase ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="gap-2 py-4">
                  <CardHeader className="px-4 pb-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Current Force</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pt-0">
                    <p className="text-2xl font-semibold">{repeaterStream.currentForceKg.toFixed(1)} kg</p>
                  </CardContent>
                </Card>
                <Card className="gap-2 py-4">
                  <CardHeader className="px-4 pb-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Peak Force</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pt-0">
                    <p className="text-2xl font-semibold">{repeaterStream.peakForceKg.toFixed(1)} kg</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <ForceChart
              samples={repeaterStream.samples}
              targetForceKg={targetForceKg}
              windowSeconds={10}
            />
          </CardContent>
        </Card>
      ) : null}

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

      {isReconnecting && hasSessionStarted ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          BLE connection lost. The repeater timer is paused while the app tries to reconnect.
        </p>
      ) : null}

      <DeleteProtocolDialog protocol={protocolToDelete} open={Boolean(protocolToDelete)} onOpenChange={handleDeleteDialogChange} />
      <Dialog open={startWarningOpen} onOpenChange={setStartWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Progressor not connected</DialogTitle>
            <DialogDescription>
              The Progressor is not connected right now. Are you sure you want to start the repeater timer anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStartWarningOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleStartWithoutDevice}>
              Start Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={stopDialogOpen} onOpenChange={handleStopDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop repeater timer?</DialogTitle>
            <DialogDescription>
              This will end the current repeater session and return you to setup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleStopDialogChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleStopConfirm}>
              Stop Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={connectionFailureDialogOpen} onOpenChange={setConnectionFailureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unable to reconnect to the Progressor</DialogTitle>
            <DialogDescription>
              The repeater timer is paused and the automatic BLE reconnect window has expired. Reconnect the device manually to resume, or abort this timer session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleKeepPausedAfterReconnectFailure}>
              Keep Paused
            </Button>
            <Button type="button" variant="destructive" onClick={handleAbortAfterReconnectFailure}>
              Abort Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
