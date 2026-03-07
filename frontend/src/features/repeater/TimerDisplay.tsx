import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TimerPhase, type TimerState } from "@/features/repeater/models";

const phaseConfig: Record<TimerPhase, { label: string; accentClassName: string }> = {
  [TimerPhase.Idle]: {
    label: "Ready",
    accentClassName: "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
  },
  [TimerPhase.Countdown]: {
    label: "Countdown",
    accentClassName: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  },
  [TimerPhase.Work]: {
    label: "PULL",
    accentClassName: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  },
  [TimerPhase.Rest]: {
    label: "REST",
    accentClassName: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100",
  },
  [TimerPhase.HandSwitch]: {
    label: "SWITCH HANDS",
    accentClassName: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100",
  },
  [TimerPhase.SetRest]: {
    label: "SET REST",
    accentClassName: "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100",
  },
  [TimerPhase.Paused]: {
    label: "Paused",
    accentClassName: "border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
  },
  [TimerPhase.Done]: {
    label: "Done",
    accentClassName: "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100",
  },
};

function formatRemainingTime(remainingSeconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingSeconds));

  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return totalSeconds.toString();
}

interface TimerDisplayProps {
  state: TimerState
}

export function TimerDisplay({ state }: TimerDisplayProps) {
  const config = phaseConfig[state.phase];

  return (
    <Card className={cn("border-2", config.accentClassName)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold tracking-wide">{config.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-6xl font-semibold tabular-nums">{formatRemainingTime(state.remainingSeconds)}</div>
          <p className="mt-2 text-sm opacity-80">Seconds remaining</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border border-current/20 bg-background/60 p-4">
            <p className="text-sm opacity-80">Rep</p>
            <p className="text-xl font-semibold">
              {state.currentRep || 0} of {state.totalReps || 0}
            </p>
          </div>

          <div className="rounded-md border border-current/20 bg-background/60 p-4">
            <p className="text-sm opacity-80">Set</p>
            <p className="text-xl font-semibold">
              {state.currentSet || 0} of {state.totalSets || 0}
            </p>
          </div>

          <div className="rounded-md border border-current/20 bg-background/60 p-4">
            <p className="text-sm opacity-80">Hand</p>
            <p className="text-xl font-semibold">{state.handLabel}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
