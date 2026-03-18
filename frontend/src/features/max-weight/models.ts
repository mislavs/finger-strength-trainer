export type MaxWeightHand = "Left" | "Right";

export interface CurrentMaxWeights {
  leftKg?: number | null
  rightKg?: number | null
}

export interface MaxWeightRecord {
  id: string
  hand: MaxWeightHand
  weightKg: number
  recordedAt: string
}

export interface CreateMaxWeightRecordInput {
  hand: MaxWeightHand
  weightKg: number
  recordedAt?: string
}
