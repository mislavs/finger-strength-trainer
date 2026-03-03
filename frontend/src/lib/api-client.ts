import { config } from "@/lib/config"

type ErrorDictionary = Record<string, string[]>

export class ApiClientError extends Error {
  public readonly status: number
  public readonly errors?: ErrorDictionary

  public constructor(message: string, status: number, errors?: ErrorDictionary) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.errors = errors
  }
}

interface JsonRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  signal?: AbortSignal
}

interface BackendErrorBody {
  Message?: string
  Errors?: Record<string, string[]>
  message?: string
  errors?: Record<string, string[]>
  title?: string
  detail?: string
}

function toCamelCaseKey(value: string): string {
  if (!value.length) {
    return value
  }

  return value[0].toLowerCase() + value.slice(1)
}

function mapErrorKeys(errors: Record<string, string[]> | undefined): ErrorDictionary | undefined {
  if (!errors) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(errors).map(([key, messages]) => [toCamelCaseKey(key), messages]),
  )
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function parseApiError(response: Response): Promise<ApiClientError> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    const text = await response.text()
    return new ApiClientError(text || "Request failed.", response.status)
  }

  const payload = (await response.json()) as BackendErrorBody
  const message = payload.message ?? payload.Message ?? payload.detail ?? payload.title ?? "Request failed."
  const errors = mapErrorKeys(payload.errors ?? payload.Errors)

  return new ApiClientError(message, response.status, errors)
}

export async function apiRequest<T>(path: string, options: JsonRequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw await parseApiError(response)
  }

  return parseJsonResponse<T>(response)
}
