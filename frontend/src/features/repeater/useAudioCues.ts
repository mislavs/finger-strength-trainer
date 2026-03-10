import { useCallback, useEffect, useRef } from "react";

import { AudioCuePlayer, type AudioCuePlayback } from "@/features/repeater/audio-cue-player";
import { TimerPhase, type TimerState } from "@/features/repeater/models";

export interface AudioCueOptions {
  audioCues: boolean
  countdownBeeps: boolean
}

function usesPerSecondBeeps(phase: TimerPhase): boolean {
  return phase === TimerPhase.Countdown
    || phase === TimerPhase.HandSwitch
    || phase === TimerPhase.SetRest;
}

function usesFinalThreeSecondBeeps(phase: TimerPhase): boolean {
  return phase === TimerPhase.HandSwitch || phase === TimerPhase.SetRest;
}

export class AudioCueController {
  private previousPhase: TimerPhase | null = null;
  private previousCountdownSecond: number | null = null;
  private readonly player: AudioCuePlayback;

  public constructor(player: AudioCuePlayback) {
    this.player = player;
  }

  public async resumeAudioContext(): Promise<void> {
    try {
      await this.player.resume();
    } catch {
      // Ignore autoplay-policy and browser support failures.
    }
  }

  public update(state: TimerState, options: AudioCueOptions): void {
    if (this.previousPhase !== state.phase) {
      this.handlePhaseChange(state.phase, options);
      this.previousPhase = state.phase;
      this.previousCountdownSecond = usesPerSecondBeeps(state.phase) ? Math.ceil(state.remainingSeconds) : null;

      if (
        options.countdownBeeps
        && usesFinalThreeSecondBeeps(state.phase)
        && this.previousCountdownSecond !== null
        && this.previousCountdownSecond > 0
        && this.previousCountdownSecond <= 3
      ) {
        this.player.playBeep();
      }

      return;
    }

    if (!usesPerSecondBeeps(state.phase)) {
      this.previousCountdownSecond = null;
      return;
    }

    const currentSecond = Math.ceil(state.remainingSeconds);
    const shouldPlayBeepForSecond = state.phase === TimerPhase.Countdown
      ? currentSecond > 0
      : currentSecond > 0 && currentSecond <= 3;

    if (
      options.countdownBeeps
      && this.previousCountdownSecond !== null
      && shouldPlayBeepForSecond
      && currentSecond < this.previousCountdownSecond
    ) {
      this.player.playBeep();
    }

    this.previousCountdownSecond = currentSecond;
  }

  private handlePhaseChange(phase: TimerPhase, options: AudioCueOptions): void {
    if (!options.audioCues) {
      return;
    }

    switch (phase) {
      case TimerPhase.Work:
        this.player.playGo();
        break;
      case TimerPhase.Rest:
        this.player.playRest();
        break;
      case TimerPhase.HandSwitch:
        this.player.playHandSwitch();
        break;
      case TimerPhase.SetRest:
        this.player.playSetRest();
        break;
      case TimerPhase.Paused:
        this.player.playPaused();
        break;
      case TimerPhase.Done:
        this.player.playDone();
        break;
      default:
        break;
    }
  }
}

export function useAudioCues(state: TimerState, options: AudioCueOptions) {
  const controllerRef = useRef<AudioCueController | null>(null);

  if (controllerRef.current === null) {
    controllerRef.current = new AudioCueController(new AudioCuePlayer());
  }

  useEffect(() => {
    controllerRef.current?.update(state, options);
  }, [options, state]);

  const resumeAudioContext = useCallback(() => {
    void controllerRef.current?.resumeAudioContext();
  }, []);

  return {
    resumeAudioContext,
  };
}
