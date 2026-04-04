import type {
  CreateWorkoutProtocolRequest,
  UpdateWorkoutProtocolRequest,
  WorkoutProtocolDto,
  WorkoutProtocolItemDto,
  WorkoutProtocolItemRequest,
  WorkoutProtocolSummaryDto,
} from "@/lib/api/schemas";

type RequiredNonNullable<T> = {
  [K in keyof T]-?: NonNullable<T[K]>
}

type WorkoutProtocolRequest = CreateWorkoutProtocolRequest & UpdateWorkoutProtocolRequest

export type WorkoutProtocolItemInput = RequiredNonNullable<WorkoutProtocolItemRequest>
export type WorkoutProtocolItem = RequiredNonNullable<WorkoutProtocolItemDto>
export type WorkoutProtocolInput = RequiredNonNullable<WorkoutProtocolRequest>
export type WorkoutProtocol = Omit<RequiredNonNullable<WorkoutProtocolDto>, "items"> & {
  items: WorkoutProtocolItem[]
}
export type WorkoutProtocolSummary = RequiredNonNullable<WorkoutProtocolSummaryDto>

export const defaultWorkoutProtocolInput: WorkoutProtocolInput = {
  name: "",
  items: [],
};

export function toWorkoutProtocolInput(protocol: WorkoutProtocol): WorkoutProtocolInput {
  return {
    name: protocol.name,
    items: protocol.items.map((item) => ({
      repeaterProtocolId: item.repeaterProtocolId,
      repetitions: item.repetitions,
      restAfterSeconds: item.restAfterSeconds,
    })),
  };
}

export function normalizeWorkoutProtocol(protocol: WorkoutProtocolDto): WorkoutProtocol {
  return {
    id: protocol.id ?? "",
    name: protocol.name ?? "",
    items: (protocol.items ?? []).map((item) => ({
      repeaterProtocolId: item.repeaterProtocolId ?? "",
      repeaterProtocolName: item.repeaterProtocolName ?? "",
      repetitions: item.repetitions ?? 0,
      restAfterSeconds: item.restAfterSeconds ?? 0,
      weightPercentage: item.weightPercentage ?? 0,
      repsPerSet: item.repsPerSet ?? 0,
      numberOfSets: item.numberOfSets ?? 0,
      workSeconds: item.workSeconds ?? 0,
      restSeconds: item.restSeconds ?? 0,
      handSwitchSeconds: item.handSwitchSeconds ?? 0,
      setRestSeconds: item.setRestSeconds ?? 0,
      countdownSeconds: item.countdownSeconds ?? 0,
      audioCues: item.audioCues ?? false,
      countdownBeeps: item.countdownBeeps ?? false,
    })),
  };
}
