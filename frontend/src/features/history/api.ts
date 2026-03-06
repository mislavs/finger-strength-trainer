import { apiRequest } from "@/lib/api-client";
import type { SessionDetail, SessionSummary } from "@/features/history/models";

export function getSessions(): Promise<SessionSummary[]> {
  return apiRequest<SessionSummary[]>("/sessions");
}

export function getSession(id: string): Promise<SessionDetail> {
  return apiRequest<SessionDetail>(`/sessions/${id}`);
}

export function deleteSession(id: string): Promise<void> {
  return apiRequest<void>(`/sessions/${id}`, {
    method: "DELETE",
  });
}
