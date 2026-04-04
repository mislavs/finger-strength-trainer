import type {
  CreateRepeaterProtocolRequest,
  RepeaterProtocolDto,
  RepeaterProtocolSummaryDto,
  UpdateRepeaterProtocolRequest,
} from "@/lib/api/schemas";

type RequiredNonNullable<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
}

type RepeaterProtocolRequest = CreateRepeaterProtocolRequest & UpdateRepeaterProtocolRequest

const secondsPerMinute = 60;

export type RepeaterProtocolSummary = RequiredNonNullable<RepeaterProtocolSummaryDto>
export type RepeaterProtocolInput = RequiredNonNullable<RepeaterProtocolRequest>
export type RepeaterProtocol = RequiredNonNullable<RepeaterProtocolDto>

export const repeaterProtocolFieldNames: Array<keyof RepeaterProtocolInput> = [
  "name",
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

export const defaultRepeaterProtocolInput: RepeaterProtocolInput = {
  name: "",
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

export function toRepeaterProtocolInput(protocol: RepeaterProtocol): RepeaterProtocolInput {
  const {
    name,
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
