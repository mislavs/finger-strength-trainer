export type TimerHand = "left" | "right";

export const TimerPhase = {
  Idle: "idle",
  Countdown: "countdown",
  Work: "work",
  Rest: "rest",
  HandSwitch: "hand-switch",
  SetRest: "set-rest",
  Paused: "paused",
  Done: "done",
} as const;

export type TimerPhase = (typeof TimerPhase)[keyof typeof TimerPhase]

export function isTickingPhase(phase: TimerPhase): boolean {
  return phase === TimerPhase.Countdown
    || phase === TimerPhase.Work
    || phase === TimerPhase.Rest
    || phase === TimerPhase.HandSwitch
    || phase === TimerPhase.SetRest;
}

export interface TimerProtocol {
  repsPerSet: number
  numberOfSets: number
  workSeconds: number
  restSeconds: number
  handSwitchSeconds: number
  setRestSeconds: number
  countdownSeconds: number
}

export interface TimerState {
  phase: TimerPhase
  remainingSeconds: number
  currentRep: number
  totalReps: number
  currentSet: number
  totalSets: number
  currentHand: TimerHand
  handLabel: string
}

export interface TimerCallbacks {
  onWorkStart?: (set: number, rep: number, hand: TimerHand) => void
  onRestStart?: (set: number, rep: number, hand: TimerHand) => void
  onHandSwitch?: () => void
  onSetRestStart?: () => void
  onSetRestComplete?: () => void
  onComplete?: () => void
}

export function getHandLabel(hand: TimerHand): string {
  return hand === "left" ? "Left Hand" : "Right Hand";
}

export function createIdleTimerState(protocol?: Partial<TimerProtocol>): TimerState {
  const currentHand: TimerHand = "left";

  return {
    phase: TimerPhase.Idle,
    remainingSeconds: 0,
    currentRep: 0,
    totalReps: protocol?.repsPerSet ?? 0,
    currentSet: 0,
    totalSets: protocol?.numberOfSets ?? 0,
    currentHand,
    handLabel: getHandLabel(currentHand),
  };
}
