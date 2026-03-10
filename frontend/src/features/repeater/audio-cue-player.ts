interface ToneSpec {
  frequency: number
  durationSeconds: number
  startOffsetSeconds?: number
  gain?: number
  type?: OscillatorType
}

export interface AudioCuePlayback {
  resume(): Promise<void>
  playBeep(): void
  playGo(): void
  playRest(): void
  playHandSwitch(): void
  playSetRest(): void
  playPaused(): void
  playDone(): void
}

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  const audioContextCtor = (globalThis as typeof globalThis & {
    webkitAudioContext?: AudioContextConstructor
  }).AudioContext ?? (globalThis as typeof globalThis & {
    webkitAudioContext?: AudioContextConstructor
  }).webkitAudioContext;

  return audioContextCtor ?? null;
}

export class AudioCuePlayer implements AudioCuePlayback {
  private context: AudioContext | null = null;

  public async resume(): Promise<void> {
    const context = this.getOrCreateContext();
    if (!context || context.state !== "suspended") {
      return;
    }

    await context.resume();
  }

  public playBeep(): void {
    this.playSequence([
      {
        frequency: 880,
        durationSeconds: 0.1,
        gain: 0.08,
      },
    ]);
  }

  public playGo(): void {
    this.playSequence([
      {
        frequency: 660,
        durationSeconds: 0.1,
        gain: 0.09,
      },
      {
        frequency: 880,
        durationSeconds: 0.14,
        startOffsetSeconds: 0.11,
        gain: 0.1,
      },
    ]);
  }

  public playRest(): void {
    this.playSequence([
      {
        frequency: 440,
        durationSeconds: 0.2,
        gain: 0.08,
        type: "triangle",
      },
    ]);
  }

  public playHandSwitch(): void {
    this.playSequence([
      {
        frequency: 587.33,
        durationSeconds: 0.12,
        gain: 0.08,
        type: "square",
      },
      {
        frequency: 493.88,
        durationSeconds: 0.12,
        startOffsetSeconds: 0.14,
        gain: 0.07,
        type: "square",
      },
    ]);
  }

  public playSetRest(): void {
    this.playSequence([
      {
        frequency: 392,
        durationSeconds: 0.14,
        gain: 0.08,
        type: "triangle",
      },
      {
        frequency: 349.23,
        durationSeconds: 0.18,
        startOffsetSeconds: 0.16,
        gain: 0.07,
        type: "triangle",
      },
    ]);
  }

  public playPaused(): void {
    this.playSequence([
      {
        frequency: 329.63,
        durationSeconds: 0.1,
        gain: 0.06,
        type: "triangle",
      },
      {
        frequency: 261.63,
        durationSeconds: 0.14,
        startOffsetSeconds: 0.11,
        gain: 0.05,
        type: "triangle",
      },
    ]);
  }

  public playDone(): void {
    this.playSequence([
      {
        frequency: 523.25,
        durationSeconds: 0.12,
        gain: 0.08,
        type: "triangle",
      },
      {
        frequency: 659.25,
        durationSeconds: 0.12,
        startOffsetSeconds: 0.14,
        gain: 0.08,
        type: "triangle",
      },
      {
        frequency: 783.99,
        durationSeconds: 0.2,
        startOffsetSeconds: 0.28,
        gain: 0.09,
        type: "triangle",
      },
    ]);
  }

  private getOrCreateContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) {
      return null;
    }

    this.context = new AudioContextCtor();
    return this.context;
  }

  private playSequence(tones: ToneSpec[]): void {
    const context = this.getOrCreateContext();
    if (!context) {
      return;
    }

    const baseTime = context.currentTime;
    for (const tone of tones) {
      this.scheduleTone(context, baseTime, tone);
    }
  }

  private scheduleTone(context: AudioContext, baseTime: number, tone: ToneSpec): void {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startTime = baseTime + (tone.startOffsetSeconds ?? 0);
    const endTime = startTime + tone.durationSeconds;
    const peakGain = tone.gain ?? 0.08;

    oscillator.type = tone.type ?? "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, startTime);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(endTime);
  }
}
