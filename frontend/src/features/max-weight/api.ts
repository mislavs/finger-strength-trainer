import { apiRequest } from "@/lib/api-client";
import type { CreateMaxWeightRecordInput, CurrentMaxWeights, MaxWeightRecord } from "@/features/max-weight/models";

export function getCurrentMaxWeights(): Promise<CurrentMaxWeights> {
  return apiRequest<CurrentMaxWeights>("/max-weights/current");
}

export function getMaxWeightHistory(): Promise<MaxWeightRecord[]> {
  return apiRequest<MaxWeightRecord[]>("/max-weights");
}

export function createMaxWeightRecord(data: CreateMaxWeightRecordInput): Promise<string> {
  return apiRequest<string>("/max-weights", {
    method: "POST",
    body: data,
  });
}
