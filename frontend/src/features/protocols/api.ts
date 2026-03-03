import { apiRequest } from "@/lib/api-client"
import type { Protocol, ProtocolInput, ProtocolSummary } from "@/features/protocols/models"

export function getProtocols(): Promise<ProtocolSummary[]> {
  return apiRequest<ProtocolSummary[]>("/protocols")
}

export function getProtocol(id: string): Promise<Protocol> {
  return apiRequest<Protocol>(`/protocols/${id}`)
}

export function createProtocol(data: ProtocolInput): Promise<string> {
  return apiRequest<string>("/protocols", {
    method: "POST",
    body: data,
  })
}

export function updateProtocol(id: string, data: ProtocolInput): Promise<void> {
  return apiRequest<void>(`/protocols/${id}`, {
    method: "PUT",
    body: data,
  })
}

export function deleteProtocol(id: string): Promise<void> {
  return apiRequest<void>(`/protocols/${id}`, {
    method: "DELETE",
  })
}
