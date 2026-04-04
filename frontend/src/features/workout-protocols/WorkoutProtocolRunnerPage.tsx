import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
import { TimerDisplay } from "@/features/repeater/TimerDisplay";
import { TimerPhase, createIdleTimerState, type TimerHand, type TimerProtocol } from "@/features/repeater/models";
import { useAudioCues } from "@/features/repeater/useAudioCues";
import { useRepeaterStream } from "@/features/repeater/useRepeaterStream";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { appRoutes } from "@/lib/app-routes";
import { useWorkoutProtocol } from "@/features/workout-protocols/hooks";
import { useWorkoutTimer } from "@/features/workout-protocols/useWorkoutTimer";

function toNonNegativeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function computeTargetWeightKg(maxWeightKg: number, weightPercentage: number): number {
  return maxWeightKg * (weightPercentage / 100);
}

function shouldShowForceChart(phase: TimerPhase): boolean {
  return phase === TimerPhase.Countdown
    || phase === TimerPhase.Work
    || phase === TimerPhase.Rest
    || phase === TimerPhase.Paused;
}

function toTimerProtocol(item: {
  repsPerSet: number
  numberOfSets: number
  workSeconds: number
  restSeconds: number
  handSwitchSeconds: number
  setRestSeconds: number
  countdownSeconds: number
}): TimerProtocol {
  return {
    repsPerSet: item.repsPerSet,
    numberOfSets: item.numberOfSets,
    workSeconds: item.workSeconds,
    restSeconds: item.restSeconds,
    handSwitchSeconds: item.handSwitchSeconds,
    setRestSeconds: item.setRestSeconds,
    countdownSeconds: item.countdownSeconds,
  };
}

function formatWorkoutRest(remainingSeconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingSeconds));
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return totalSeconds.toString();
}

export function WorkoutProtocolRunnerPage() {
  const params = useParams();
  const id = params.id ?? "";
  const workoutProtocolQuery = useWorkoutProtocol(id);
  const currentMaxWeightsQuery = useCurrentMaxWeights();
  const { status: deviceStatus } = useDeviceStatus();
  const [startWarningOpen, setStartWarningOpen] = useState(false);
  const [startingHand, setStartingHand] = useState<TimerHand>("left");
  const [sessionLeftMaxWeightKg, setSessionLeftMaxWeightKg] = useState<number | undefined>(undefined);
  const [sessionRightMaxWeightKg, setSessionRightMaxWeightKg] = useState<number | undefined>(undefined);
  const repeaterStream = useRepeaterStream();

  const blocks = useMemo(() => {
    if (!workoutProtocolQuery.data) {
      return [];
    }

    return workoutProtocolQuery.data.items.flatMap((item) =>
      Array.from({ length: item.repetitions }, () => ({
        name: item.repeaterProtocolName,
        timerProtocol: toTimerProtocol(item),
        weightPercentage: item.weightPercentage,
        audioCues: item.audioCues,
        countdownBeeps: item.countdownBeeps,
        restAfterSeconds: item.restAfterSeconds,
      })),
    );
  }, [workoutProtocolQuery.data]);

  const workoutTimerCallbacks = useMemo(() => ({
    onWorkStart: (_set: number, rep: number) => {
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
    onBlockComplete: () => {
      void repeaterStream.stop();
      repeaterStream.resetSamples();
    },
    onComplete: () => {
      void repeaterStream.stop();
    },
  }), [deviceStatus.isConnected, repeaterStream]);

  const workoutTimer = useWorkoutTimer({
    blocks,
    callbacks: workoutTimerCallbacks,
  });

  const activeBlock = workoutTimer.state.currentBlock;
  const audioTimerState = workoutTimer.state.isWorkoutRest ? createIdleTimerState() : workoutTimer.state.timerState;
  const { resumeAudioContext } = useAudioCues(audioTimerState, {
    audioCues: activeBlock?.audioCues ?? false,
    countdownBeeps: activeBlock?.countdownBeeps ?? false,
  });

  const hasSessionStarted = workoutTimer.state.mode !== "idle";
  const isPaused = workoutTimer.state.isPaused;
  const isRunning = workoutTimer.state.isRunning;
  const hasForceSamples = repeaterStream.samples.length > 0;
  const showForceChart = !workoutTimer.state.isWorkoutRest
    && hasSessionStarted
    && shouldShowForceChart(workoutTimer.state.timerState.phase)
    && (deviceStatus.isConnected || hasForceSamples);

  const leftReferenceMaxWeightKg = toNonNegativeNumber(sessionLeftMaxWeightKg ?? currentMaxWeightsQuery.data?.leftKg);
  const rightReferenceMaxWeightKg = toNonNegativeNumber(sessionRightMaxWeightKg ?? currentMaxWeightsQuery.data?.rightKg);
  const activeHandReferenceMaxWeightKg = workoutTimer.state.timerState.currentHand === "right"
    ? rightReferenceMaxWeightKg
    : leftReferenceMaxWeightKg;
  const targetForceKg = activeBlock && workoutTimer.state.timerState.phase === TimerPhase.Work
    ? computeTargetWeightKg(activeHandReferenceMaxWeightKg, activeBlock.weightPercentage)
    : undefined;

  function startWorkout(): void {
    resumeAudioContext();
    repeaterStream.resetSamples();
    if (deviceStatus.isConnected) {
      void repeaterStream.start();
    }
    workoutTimer.start(startingHand);
  }

  function handleStart(): void {
    if (!deviceStatus.isConnected) {
      setStartWarningOpen(true);
      return;
    }

    startWorkout();
  }

  function handleStartWithoutDevice(): void {
    setStartWarningOpen(false);
    startWorkout();
  }

  function handleStop(): void {
    void repeaterStream.stop();
    repeaterStream.resetSamples();
    workoutTimer.stop();
  }

  if (workoutProtocolQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (workoutProtocolQuery.isError || !workoutProtocolQuery.data) {
    return <p className="text-destructive">Failed to load this workout protocol.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{workoutProtocolQuery.data.name}</h1>
          <p className="text-sm text-muted-foreground">
            {workoutProtocolQuery.data.items.length} items, {blocks.length} total blocks
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!hasSessionStarted ? (
            <Button onClick={handleStart} disabled={!blocks.length}>
              Start Workout
            </Button>
          ) : null}

          {isRunning && !isPaused ? (
            <Button variant="outline" onClick={workoutTimer.pause}>
              Pause
            </Button>
          ) : null}

          {isPaused ? (
            <Button variant="outline" onClick={workoutTimer.resume}>
              Resume
            </Button>
          ) : null}

          {hasSessionStarted ? (
            <Button variant={isRunning ? "destructive" : "outline"} onClick={handleStop}>
              {isRunning ? "Stop" : "Back to Setup"}
            </Button>
          ) : null}

          <Button asChild variant="outline">
            <Link to={appRoutes.workoutProtocols}>Back</Link>
          </Button>
        </div>
      </div>

      {!hasSessionStarted ? (
        <Card>
          <CardHeader>
            <CardTitle>Workout Setup</CardTitle>
            <CardDescription>Choose your starting hand and optional session max-weight overrides.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Starting Hand</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={startingHand === "left" ? "default" : "outline"} onClick={() => setStartingHand("left")}>
                  Left
                </Button>
                <Button type="button" variant={startingHand === "right" ? "default" : "outline"} onClick={() => setStartingHand("right")}>
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
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {hasSessionStarted ? (
        <Card>
          <CardHeader>
            <CardTitle>Workout Progress</CardTitle>
            <CardDescription>
              {workoutTimer.state.currentBlock
                ? `Block ${workoutTimer.state.currentBlockIndex} of ${workoutTimer.state.totalBlocks}: ${workoutTimer.state.currentBlock.name}`
                : workoutTimer.state.isComplete
                  ? "Workout complete."
                  : "Workout in progress."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {hasSessionStarted && !workoutTimer.state.isWorkoutRest ? (
        <TimerDisplay state={workoutTimer.state.timerState} />
      ) : null}

      {workoutTimer.state.isWorkoutRest ? (
        <Card>
          <CardHeader>
            <CardTitle>Workout Rest</CardTitle>
            <CardDescription>
              Up next: Block {workoutTimer.state.currentBlockIndex} of {workoutTimer.state.totalBlocks}
              {workoutTimer.state.currentBlock ? `, ${workoutTimer.state.currentBlock.name}` : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-6xl font-semibold tabular-nums">{formatWorkoutRest(workoutTimer.state.workoutRestRemainingSeconds)}</div>
            <p className="mt-2 text-sm text-muted-foreground">Seconds remaining before the next block starts</p>
          </CardContent>
        </Card>
      ) : null}

      {showForceChart ? (
        <Card className="gap-4 py-4">
          <CardHeader className="px-4 pb-0">
            <CardTitle>Live Force Stream</CardTitle>
            <CardDescription>
              {isPaused
                ? "Live force stream paused. The chart remains visible until you resume."
                : "Real-time Tindeq force data for the active workout block."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pt-0">
            {workoutTimer.state.timerState.phase === TimerPhase.Work ? (
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

      <Dialog open={startWarningOpen} onOpenChange={setStartWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Progressor not connected</DialogTitle>
            <DialogDescription>
              The Progressor is not connected right now. Are you sure you want to start the workout anyway?
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
    </div>
  );
}
