import { apiRequest } from "@/lib/api-client";
import {
  normalizeWorkoutProtocol,
  type WorkoutProtocol,
  type WorkoutProtocolInput,
  type WorkoutProtocolSummary,
} from "@/features/workout-protocols/models";
import type { WorkoutProtocolDto } from "@/lib/api/schemas";

const workoutProtocolsPath = "/workout-protocols";

export function getWorkoutProtocols(): Promise<WorkoutProtocolSummary[]> {
  return apiRequest<WorkoutProtocolSummary[]>(workoutProtocolsPath);
}

export async function getWorkoutProtocol(id: string): Promise<WorkoutProtocol> {
  const protocol = await apiRequest<WorkoutProtocolDto>(`${workoutProtocolsPath}/${id}`);
  return normalizeWorkoutProtocol(protocol);
}

export function createWorkoutProtocol(data: WorkoutProtocolInput): Promise<string> {
  return apiRequest<string>(workoutProtocolsPath, {
    method: "POST",
    body: data,
  });
}

export function updateWorkoutProtocol(id: string, data: WorkoutProtocolInput): Promise<void> {
  return apiRequest<void>(`${workoutProtocolsPath}/${id}`, {
    method: "PUT",
    body: data,
  });
}

export function deleteWorkoutProtocol(id: string): Promise<void> {
  return apiRequest<void>(`${workoutProtocolsPath}/${id}`, {
    method: "DELETE",
  });
}
