export interface LiveStatsSnapshot {
  currentForceKg: number
  peakForceKg: number
  durationSeconds: number
  avgForceKg: number | null
}

export type LiveStreamState = "idle" | "streaming"
