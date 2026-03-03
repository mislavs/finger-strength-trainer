import type {
  CreateProtocolRequest,
  ProtocolDto,
  ProtocolSummaryDto,
  UpdateProtocolRequest,
} from "@/lib/api/schemas"

type RequiredNonNullable<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
}

type ProtocolRequest = CreateProtocolRequest & UpdateProtocolRequest

export type ProtocolSummary = RequiredNonNullable<ProtocolSummaryDto>
export type ProtocolInput = RequiredNonNullable<ProtocolRequest>
export type Protocol = RequiredNonNullable<ProtocolDto>

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
