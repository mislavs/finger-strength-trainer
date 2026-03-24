export interface CurrentMaxWeights {
  leftKg?: number | null
  rightKg?: number | null
}

export interface MaxWeightRecord {
  id: string
  leftWeightKg?: number | null
  rightWeightKg?: number | null
  recordedAt: string
}

export interface CreateMaxWeightRecordInput {
  leftWeightKg?: number | null
  rightWeightKg?: number | null
  recordedAt?: string
}
