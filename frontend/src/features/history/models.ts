export interface SessionSummary {
  id: string
  date: string
  type: string
  protocolName: string
  isComplete: boolean
  peakForceKg: number
  avgForceKg: number
  durationSeconds: number
}

export interface SessionSample {
  hand: string | null
  setNumber: number | null
  weightKg: number
  timestampSeconds: number
}

export interface SessionDetail extends SessionSummary {
  samples: SessionSample[]
}
