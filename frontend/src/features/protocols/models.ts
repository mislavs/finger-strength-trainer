export interface ProtocolSummary {
  id: string
  name: string
  weightPercentage: number
  setsPerHand: number
  workSeconds: number
  isDefault: boolean
}

export interface ProtocolInput {
  name: string
  maxWeightKg: number
  weightPercentage: number
  setsPerHand: number
  workSeconds: number
  restSeconds: number
  handSwitchSeconds: number
  countdownSeconds: number
  audioCues: boolean
  countdownBeeps: boolean
}

export interface Protocol extends ProtocolInput {
  id: string
  isDefault: boolean
  targetWeightKg: number
}

export const protocolFieldNames: Array<keyof ProtocolInput> = [
  "name",
  "maxWeightKg",
  "weightPercentage",
  "setsPerHand",
  "workSeconds",
  "restSeconds",
  "handSwitchSeconds",
  "countdownSeconds",
  "audioCues",
  "countdownBeeps",
]

export const defaultProtocolInput: ProtocolInput = {
  name: "",
  maxWeightKg: 0,
  weightPercentage: 60,
  setsPerHand: 10,
  workSeconds: 7,
  restSeconds: 3,
  handSwitchSeconds: 30,
  countdownSeconds: 5,
  audioCues: true,
  countdownBeeps: true,
}

export function toProtocolInput(protocol: Protocol): ProtocolInput {
  const {
    name,
    maxWeightKg,
    weightPercentage,
    setsPerHand,
    workSeconds,
    restSeconds,
    handSwitchSeconds,
    countdownSeconds,
    audioCues,
    countdownBeeps,
  } = protocol

  return {
    name,
    maxWeightKg,
    weightPercentage,
    setsPerHand,
    workSeconds,
    restSeconds,
    handSwitchSeconds,
    countdownSeconds,
    audioCues,
    countdownBeeps,
  }
}
