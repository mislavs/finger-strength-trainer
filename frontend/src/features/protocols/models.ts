import type {
  CreateProtocolRequest,
  ProtocolDto,
  ProtocolSummaryDto,
  UpdateProtocolRequest,
} from "@/lib/api/schemas";

type RequiredNonNullable<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
}

type ProtocolRequest = CreateProtocolRequest & UpdateProtocolRequest

const secondsPerMinute = 60;

export type ProtocolSummary = RequiredNonNullable<ProtocolSummaryDto>
export type ProtocolInput = RequiredNonNullable<ProtocolRequest>
export type Protocol = RequiredNonNullable<ProtocolDto>

export const protocolFieldNames: Array<keyof ProtocolInput> = [
  "name",
  "maxWeightKg",
  "weightPercentage",
  "repsPerSet",
  "numberOfSets",
  "workSeconds",
  "restSeconds",
  "handSwitchSeconds",
  "setRestSeconds",
  "countdownSeconds",
  "audioCues",
  "countdownBeeps",
];

export const defaultProtocolInput: ProtocolInput = {
  name: "",
  maxWeightKg: 0,
  weightPercentage: 60,
  repsPerSet: 10,
  numberOfSets: 1,
  workSeconds: 7,
  restSeconds: 3,
  handSwitchSeconds: 30,
  setRestSeconds: 0,
  countdownSeconds: 5,
  audioCues: true,
  countdownBeeps: true,
};

export function toProtocolInput(protocol: Protocol): ProtocolInput {
  const {
    name,
    maxWeightKg,
    weightPercentage,
    repsPerSet,
    numberOfSets,
    workSeconds,
    restSeconds,
    handSwitchSeconds,
    setRestSeconds,
    countdownSeconds,
    audioCues,
    countdownBeeps,
  } = protocol;

  return {
    name,
    maxWeightKg,
    weightPercentage,
    repsPerSet,
    numberOfSets,
    workSeconds,
    restSeconds,
    handSwitchSeconds,
    setRestSeconds: setRestSeconds / secondsPerMinute,
    countdownSeconds,
    audioCues,
    countdownBeeps,
  };
}
