import {
  createIdleTimerState,
  getHandLabel,
  isTickingPhase,
  TimerPhase,
  type TimerCallbacks,
  type TimerHand,
  type TimerProtocol,
  type TimerState,
} from "@/features/repeater/models";

const resumeCountdownSeconds = 3;

interface ResumeState {
  phase: TimerPhase
  remainingMs: number
}

function toMilliseconds(seconds: number): number {
  return Math.max(0, Math.round(seconds * 1000));
}

function toSeconds(milliseconds: number): number {
  return Math.max(0, milliseconds) / 1000;
}

export class TimerMachine {
  private readonly protocol: TimerProtocol;
  private readonly callbacks: TimerCallbacks;

  private state: TimerState;
  private remainingMs = 0;
  private firstHand: TimerHand = "left";
  private secondHand: TimerHand = "right";
  private resumeState: ResumeState | null = null;

  public constructor(protocol: TimerProtocol, callbacks: TimerCallbacks = {}) {
    this.protocol = protocol;
    this.callbacks = callbacks;
    this.state = createIdleTimerState(protocol);
  }

  public getState(): TimerState {
    return { ...this.state };
  }

  public start(firstHand: TimerHand): TimerState {
    this.firstHand = firstHand;
    this.secondHand = firstHand === "left" ? "right" : "left";
    this.resumeState = null;
    this.state = {
      phase: TimerPhase.Idle,
      remainingSeconds: 0,
      currentRep: 1,
      totalReps: this.protocol.repsPerSet,
      currentSet: 1,
      totalSets: this.protocol.numberOfSets,
      currentHand: this.firstHand,
      handLabel: getHandLabel(this.firstHand),
    };

    this.enterCountdownPhase(toMilliseconds(this.protocol.countdownSeconds));
    this.resolveImmediateTransitions();

    return this.getState();
  }

  public pause(): TimerState {
    if (!isTickingPhase(this.state.phase)) {
      return this.getState();
    }

    this.resumeState = {
      phase: this.state.phase,
      remainingMs: this.remainingMs,
    };

    this.setPhase(TimerPhase.Paused, this.remainingMs);
    return this.getState();
  }

  public resume(): TimerState {
    if (this.state.phase !== TimerPhase.Paused || !this.resumeState) {
      return this.getState();
    }

    this.enterCountdownPhase(toMilliseconds(resumeCountdownSeconds));
    this.resolveImmediateTransitions();

    return this.getState();
  }

  public stop(): TimerState {
    this.remainingMs = 0;
    this.resumeState = null;
    this.state = createIdleTimerState(this.protocol);
    return this.getState();
  }

  public skipHandSwitch(): TimerState {
    if (this.state.phase !== TimerPhase.HandSwitch) {
      return this.getState();
    }

    this.remainingMs = 0;
    this.completeCurrentPhase();
    this.resolveImmediateTransitions();

    return this.getState();
  }

  public tick(elapsedMs: number): TimerState {
    if (!isTickingPhase(this.state.phase)) {
      return this.getState();
    }

    let remainingElapsedMs = Math.max(0, Math.round(elapsedMs));

    while (remainingElapsedMs > 0 && isTickingPhase(this.state.phase)) {
      this.resolveImmediateTransitions();

      if (!isTickingPhase(this.state.phase)) {
        break;
      }

      if (this.remainingMs > remainingElapsedMs) {
        this.remainingMs -= remainingElapsedMs;
        remainingElapsedMs = 0;
        this.syncRemainingSeconds();
        break;
      }

      remainingElapsedMs -= this.remainingMs;
      this.remainingMs = 0;
      this.syncRemainingSeconds();
      this.completeCurrentPhase();
    }

    this.resolveImmediateTransitions();
    this.syncRemainingSeconds();

    return this.getState();
  }

  private resolveImmediateTransitions(): void {
    let transitions = 0;

    while (isTickingPhase(this.state.phase) && this.remainingMs <= 0) {
      this.completeCurrentPhase();
      transitions += 1;

      if (transitions > 16) {
        throw new Error("TimerMachine exceeded immediate transition safety limit.");
      }
    }
  }

  private completeCurrentPhase(): void {
    switch (this.state.phase) {
      case TimerPhase.Countdown:
        this.completeCountdown();
        break;
      case TimerPhase.Work:
        this.completeWork();
        break;
      case TimerPhase.Rest:
        this.completeRest();
        break;
      case TimerPhase.HandSwitch:
        this.completeHandSwitch();
        break;
      case TimerPhase.SetRest:
        this.completeSetRest();
        break;
      default:
        break;
    }
  }

  private completeCountdown(): void {
    if (this.resumeState) {
      const resumeState = this.resumeState;
      this.resumeState = null;
      this.setPhase(resumeState.phase, resumeState.remainingMs);
      return;
    }

    this.enterWorkPhase();
  }

  private completeWork(): void {
    if (this.state.currentRep < this.state.totalReps) {
      this.enterRestPhase();
      return;
    }

    if (this.state.currentHand === this.firstHand) {
      this.enterHandSwitchPhase();
      return;
    }

    if (this.state.currentSet < this.state.totalSets) {
      this.enterSetRestPhase();
      return;
    }

    this.setPhase(TimerPhase.Done, 0);
    this.callbacks.onComplete?.();
  }

  private completeRest(): void {
    this.state = {
      ...this.state,
      currentRep: this.state.currentRep + 1,
    };

    this.enterWorkPhase();
  }

  private completeHandSwitch(): void {
    this.enterWorkPhase();
  }

  private completeSetRest(): void {
    this.callbacks.onSetRestComplete?.();
    this.enterWorkPhase();
  }

  private enterCountdownPhase(durationMs: number): void {
    this.setPhase(TimerPhase.Countdown, durationMs);
  }

  private enterWorkPhase(invokeCallback = true): void {
    this.setPhase(TimerPhase.Work, toMilliseconds(this.protocol.workSeconds));

    if (invokeCallback) {
      this.callbacks.onWorkStart?.(this.state.currentSet, this.state.currentRep, this.state.currentHand);
    }
  }

  private enterRestPhase(): void {
    this.setPhase(TimerPhase.Rest, toMilliseconds(this.protocol.restSeconds));
    this.callbacks.onRestStart?.(this.state.currentSet, this.state.currentRep, this.state.currentHand);
  }

  private enterHandSwitchPhase(): void {
    this.state = {
      ...this.state,
      currentRep: 1,
      currentHand: this.secondHand,
      handLabel: getHandLabel(this.secondHand),
    };
    this.setPhase(TimerPhase.HandSwitch, toMilliseconds(this.protocol.handSwitchSeconds));
    this.callbacks.onHandSwitch?.();
  }

  private enterSetRestPhase(): void {
    const nextSet = this.state.currentSet + 1;
    this.state = {
      ...this.state,
      currentRep: 1,
      currentSet: nextSet,
      currentHand: this.firstHand,
      handLabel: getHandLabel(this.firstHand),
    };
    this.setPhase(TimerPhase.SetRest, toMilliseconds(this.protocol.setRestSeconds));
    this.callbacks.onSetRestStart?.();
  }

  private setPhase(phase: TimerPhase, durationMs: number): void {
    this.remainingMs = Math.max(0, durationMs);
    this.state = {
      ...this.state,
      phase,
      remainingSeconds: toSeconds(this.remainingMs),
      handLabel: getHandLabel(this.state.currentHand),
    };
  }

  private syncRemainingSeconds(): void {
    this.state = {
      ...this.state,
      remainingSeconds: toSeconds(this.remainingMs),
      handLabel: getHandLabel(this.state.currentHand),
    };
  }
}
