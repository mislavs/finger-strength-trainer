import type { AudioCuePlayback } from "@/features/repeater/audio-cue-player";
import { TimerPhase, type TimerState } from "@/features/repeater/models";
import { AudioCueController, type AudioCueOptions } from "@/features/repeater/useAudioCues";

function createState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    phase: TimerPhase.Idle,
    remainingSeconds: 0,
    currentRep: 0,
    totalReps: 1,
    currentSet: 0,
    totalSets: 1,
    currentHand: "left",
    handLabel: "Left Hand",
    ...overrides,
  };
}

function createPlayer(): AudioCuePlayback & {
  playBeep: ReturnType<typeof vi.fn>
  playGo: ReturnType<typeof vi.fn>
  playRest: ReturnType<typeof vi.fn>
  playHandSwitch: ReturnType<typeof vi.fn>
  playSetRest: ReturnType<typeof vi.fn>
  playPaused: ReturnType<typeof vi.fn>
  playDone: ReturnType<typeof vi.fn>
  resume: ReturnType<typeof vi.fn>
} {
  return {
    playBeep: vi.fn(),
    playGo: vi.fn(),
    playRest: vi.fn(),
    playHandSwitch: vi.fn(),
    playSetRest: vi.fn(),
    playPaused: vi.fn(),
    playDone: vi.fn(),
    resume: vi.fn().mockResolvedValue(undefined),
  };
}

const enabledOptions: AudioCueOptions = {
  audioCues: true,
  countdownBeeps: true,
};

describe("AudioCueController", () => {
  it("does not play a phase-entry cue when the timer enters countdown", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Idle }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 3 }), enabledOptions);

    expect(player.playGo).not.toHaveBeenCalled();
    expect(player.playRest).not.toHaveBeenCalled();
    expect(player.playHandSwitch).not.toHaveBeenCalled();
    expect(player.playSetRest).not.toHaveBeenCalled();
    expect(player.playPaused).not.toHaveBeenCalled();
    expect(player.playDone).not.toHaveBeenCalled();
  });

  it("plays the go cue when the timer transitions into work", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Idle }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 7 }), enabledOptions);

    expect(player.playGo).toHaveBeenCalledTimes(1);
    expect(player.playRest).not.toHaveBeenCalled();
    expect(player.playDone).not.toHaveBeenCalled();
  });

  it("plays the rest cue when the timer transitions into rest", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 7 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Rest, remainingSeconds: 3 }), enabledOptions);

    expect(player.playRest).toHaveBeenCalledTimes(1);
    expect(player.playGo).toHaveBeenCalledTimes(1);
    expect(player.playDone).not.toHaveBeenCalled();
  });

  it("plays the done cue when the timer completes", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 1 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Done }), enabledOptions);

    expect(player.playDone).toHaveBeenCalledTimes(1);
  });

  it("plays the hand switch cue when the timer transitions into hand switch", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 1 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 20 }), enabledOptions);

    expect(player.playHandSwitch).toHaveBeenCalledTimes(1);
  });

  it("plays the set rest cue when the timer transitions into set rest", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 1 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 120 }), enabledOptions);

    expect(player.playSetRest).toHaveBeenCalledTimes(1);
  });

  it("plays the paused cue when the timer transitions into paused", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 3 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Paused, remainingSeconds: 3 }), enabledOptions);

    expect(player.playPaused).toHaveBeenCalledTimes(1);
  });

  it("suppresses phase cues when audio cues are disabled", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);
    const options: AudioCueOptions = {
      audioCues: false,
      countdownBeeps: true,
    };

    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 7 }), options);
    controller.update(createState({ phase: TimerPhase.Rest, remainingSeconds: 3 }), options);
    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 20 }), options);
    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 120 }), options);
    controller.update(createState({ phase: TimerPhase.Paused, remainingSeconds: 3 }), options);
    controller.update(createState({ phase: TimerPhase.Done }), options);

    expect(player.playGo).not.toHaveBeenCalled();
    expect(player.playRest).not.toHaveBeenCalled();
    expect(player.playHandSwitch).not.toHaveBeenCalled();
    expect(player.playSetRest).not.toHaveBeenCalled();
    expect(player.playPaused).not.toHaveBeenCalled();
    expect(player.playDone).not.toHaveBeenCalled();
  });

  it("plays countdown beeps only when a whole second boundary is crossed", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 3 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 2.8 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 1.9 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 1.1 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 0.9 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 0 }), enabledOptions);

    expect(player.playBeep).toHaveBeenCalledTimes(2);
  });

  it("suppresses countdown beeps when disabled", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);
    const options: AudioCueOptions = {
      audioCues: true,
      countdownBeeps: false,
    };

    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 3 }), options);
    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 1.9 }), options);
    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 0.9 }), options);

    expect(player.playBeep).not.toHaveBeenCalled();
  });

  it("plays hand switch beeps only during the last three seconds", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 5 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 4.2 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 3.9 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 2.9 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 1.9 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 0.9 }), enabledOptions);

    expect(player.playBeep).toHaveBeenCalledTimes(3);
  });

  it("plays a hand switch beep immediately when the phase starts inside the last three seconds", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 3 }), enabledOptions);

    expect(player.playBeep).toHaveBeenCalledTimes(1);
  });

  it("plays set rest beeps only during the last three seconds", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 6 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 3.8 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 2.8 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 1.8 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 0.8 }), enabledOptions);

    expect(player.playBeep).toHaveBeenCalledTimes(3);
  });

  it("does not play hand switch or set rest beeps when countdown beeps are disabled", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);
    const options: AudioCueOptions = {
      audioCues: true,
      countdownBeeps: false,
    };

    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 3 }), options);
    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 2.8 }), options);
    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 3 }), options);
    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 2.8 }), options);

    expect(player.playBeep).not.toHaveBeenCalled();
  });

  it("does not duplicate sounds while remaining in the same phase", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 7 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 6.8 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 6.3 }), enabledOptions);

    expect(player.playGo).toHaveBeenCalledTimes(1);
    expect(player.playBeep).not.toHaveBeenCalled();
  });

  it("plays distinct cues for each non-idle phase transition", () => {
    const player = createPlayer();
    const controller = new AudioCueController(player);

    controller.update(createState({ phase: TimerPhase.Countdown, remainingSeconds: 3 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Work, remainingSeconds: 7 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Rest, remainingSeconds: 3 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.HandSwitch, remainingSeconds: 20 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.SetRest, remainingSeconds: 120 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Paused, remainingSeconds: 10 }), enabledOptions);
    controller.update(createState({ phase: TimerPhase.Done }), enabledOptions);

    expect(player.playBeep).not.toHaveBeenCalled();
    expect(player.playGo).toHaveBeenCalledTimes(1);
    expect(player.playRest).toHaveBeenCalledTimes(1);
    expect(player.playHandSwitch).toHaveBeenCalledTimes(1);
    expect(player.playSetRest).toHaveBeenCalledTimes(1);
    expect(player.playPaused).toHaveBeenCalledTimes(1);
    expect(player.playDone).toHaveBeenCalledTimes(1);
  });

  it("swallows resume failures from the playback layer", async () => {
    const player = createPlayer();
    player.resume.mockRejectedValueOnce(new Error("blocked"));
    const controller = new AudioCueController(player);

    await expect(controller.resumeAudioContext()).resolves.toBeUndefined();
  });
});
