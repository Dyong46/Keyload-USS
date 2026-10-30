/** Browser-side API transport. Next.js proxies /api/* to the NestJS backend. */
const API_BASE_PATH = "/api"

type QueryScalar = string | number | boolean
export type ApiQuery = Record<
  string,
  QueryScalar | readonly QueryScalar[] | null | undefined
>

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  /** JSON request body. FormData/file uploads are not handled by this helper. */
  body?: unknown
  query?: ApiQuery
}

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

function buildUrl(path: string, query?: ApiQuery): string {
  // Resolve against a placeholder origin so query encoding and path checks also
  // work in tests without a browser. Only relative backend paths are accepted.
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("#")) {
    throw new Error(
      "API paths must start with a single / and contain no fragment."
    )
  }

  const base = new URL(`${API_BASE_PATH}/`, "http://api.local")
  const url = new URL(`${API_BASE_PATH}${path}`, base)
  if (
    url.origin !== base.origin ||
    (url.pathname !== API_BASE_PATH &&
      !url.pathname.startsWith(`${API_BASE_PATH}/`))
  ) {
    throw new Error("API paths must stay inside the configured API prefix.")
  }

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) continue
    url.searchParams.delete(key)
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) url.searchParams.append(key, String(item))
  }

  return `${url.pathname}${url.search}`
}

function errorMessage(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = data.message
    if (typeof message === "string" && message) return message
    if (Array.isArray(message)) {
      const messages = message.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      )
      if (messages.length) return messages.join("; ")
    }
  }
  return `API request failed (HTTP ${status}).`
}

/**
 * JSON/text responses are returned directly, without a response envelope.
 * T is a compile-time expectation, not runtime response validation.
 * Use T = void for endpoints returning no content. Network and abort errors
 * remain native fetch errors. No retries or UI notifications are performed.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { query, body, headers: initialHeaders, ...init } = options
  const headers = new Headers(initialHeaders)
  if (!headers.has("Accept")) headers.set("Accept", "application/json")

  let serializedBody: string | undefined
  if (body !== undefined) {
    serializedBody = JSON.stringify(body)
    if (serializedBody === undefined) {
      throw new TypeError("The API request body must be JSON serializable.")
    }
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
  }

  const response = await fetch(buildUrl(path, query), {
    cache: "no-store",
    ...init,
    headers,
    body: serializedBody,
  })

  const text = await response.text()
  const mediaType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase()
  const isJson =
    mediaType === "application/json" || mediaType?.endsWith("+json")
  let data: unknown = text || undefined

  if (text && isJson) {
    try {
      data = JSON.parse(text)
    } catch (error) {
      // Preserve HTTP failure status even if an upstream returns malformed JSON.
      // A malformed successful JSON response is a parsing error, not success.
      if (response.ok) throw error
    }
  }

  if (!response.ok) {
    throw new ApiError(
      errorMessage(data, response.status),
      response.status,
      data
    )
  }

  return data as T
}

type ReadOptions = Omit<ApiRequestOptions, "method" | "body">
type WriteOptions = Omit<ApiRequestOptions, "method" | "body">

export const api = {
  get: <T = unknown>(path: string, options?: ReadOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: WriteOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T = unknown>(path: string, body?: unknown, options?: WriteOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: WriteOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T = unknown>(path: string, options?: ReadOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
}
