import { apiRequest } from "@/lib/api-client";
import type { Protocol, ProtocolInput, ProtocolSummary } from "@/features/protocols/models";
import {
  getCreateProtocolUrl,
  getDeleteProtocolUrl,
  getGetProtocolByIdUrl,
  getGetProtocolsUrl,
  getUpdateProtocolUrl,
} from "@/lib/api/generated/protocols/protocols";

function toApiRequestPath(generatedUrl: string): string {
  return generatedUrl.startsWith("/api/") ? generatedUrl.slice(4) : generatedUrl;
}

export function getProtocols(): Promise<ProtocolSummary[]> {
  return apiRequest<ProtocolSummary[]>(toApiRequestPath(getGetProtocolsUrl()));
}

export function getProtocol(id: string): Promise<Protocol> {
  return apiRequest<Protocol>(toApiRequestPath(getGetProtocolByIdUrl(id)));
}

export function createProtocol(data: ProtocolInput): Promise<string> {
  return apiRequest<string>(toApiRequestPath(getCreateProtocolUrl()), {
    method: "POST",
    body: data,
  });
}

export function updateProtocol(id: string, data: ProtocolInput): Promise<void> {
  return apiRequest<void>(toApiRequestPath(getUpdateProtocolUrl(id)), {
    method: "PUT",
    body: data,
  });
}

export function deleteProtocol(id: string): Promise<void> {
  return apiRequest<void>(toApiRequestPath(getDeleteProtocolUrl(id)), {
    method: "DELETE",
  });
}
