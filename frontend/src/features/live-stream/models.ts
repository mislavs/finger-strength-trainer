export interface ForceSamplePoint {
  weightKg: number
  timestampSeconds: number
}

export interface LiveStreamStoppedStats {
  peakForceKg: number
  avgForceKg: number
  durationSeconds: number
}

export interface LiveStatsSnapshot {
  currentForceKg: number
  peakForceKg: number
  durationSeconds: number
  avgForceKg: number | null
}

export type LiveStreamState = "idle" | "streaming" | "stopped"
