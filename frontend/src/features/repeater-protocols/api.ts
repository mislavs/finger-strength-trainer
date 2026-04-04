import { apiRequest } from "@/lib/api-client";
import type {
  RepeaterProtocol,
  RepeaterProtocolInput,
  RepeaterProtocolSummary,
} from "@/features/repeater-protocols/models";

const repeaterProtocolsPath = "/repeater-protocols";

export function getRepeaterProtocols(): Promise<RepeaterProtocolSummary[]> {
  return apiRequest<RepeaterProtocolSummary[]>(repeaterProtocolsPath);
}

export function getRepeaterProtocol(id: string): Promise<RepeaterProtocol> {
  return apiRequest<RepeaterProtocol>(`${repeaterProtocolsPath}/${id}`);
}

export function createRepeaterProtocol(data: RepeaterProtocolInput): Promise<string> {
  return apiRequest<string>(repeaterProtocolsPath, {
    method: "POST",
    body: data,
  });
}

export function updateRepeaterProtocol(id: string, data: RepeaterProtocolInput): Promise<void> {
  return apiRequest<void>(`${repeaterProtocolsPath}/${id}`, {
    method: "PUT",
    body: data,
  });
}

export function deleteRepeaterProtocol(id: string): Promise<void> {
  return apiRequest<void>(`${repeaterProtocolsPath}/${id}`, {
    method: "DELETE",
  });
}
