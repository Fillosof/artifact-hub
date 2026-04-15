const API_URL = (process.env.ARTIFACT_HUB_API_URL ?? '').replace(/\/$/, '')
const API_KEY = process.env.ARTIFACT_HUB_API_KEY ?? ''

/**
 * Authenticated HTTP client for the Artifact Hub API.
 * All requests include `Authorization: Bearer <key>` from env.
 * No DB or Turso access occurs here — all DB interaction is server-side.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${API_URL}${path}`
  const headers = new Headers(options.headers as ConstructorParameters<typeof Headers>[0])
  headers.set('Authorization', `Bearer ${API_KEY}`)
  return fetch(url, { ...options, headers })
}

export function getApiUrl(): string {
  return API_URL
}
