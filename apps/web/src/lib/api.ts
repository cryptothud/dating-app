import type { ApiError } from '@dating-app/types'
import { toast } from './toast'

// In the browser, always use /api — Next.js rewrites proxy it to Railway in
// production and to localhost:4000 in dev. This keeps cookies same-origin
// (set on the Vercel domain, not Railway) so SameSite=Lax works on all browsers.
// On the server (SSR), call Railway or localhost directly since rewrites are browser-only.
function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '/api'
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  return envUrl ?? 'http://localhost:4000/api'
}
const BASE_URL = getBaseUrl()

export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

// Deduplicates concurrent refresh attempts so only one /auth/refresh is in flight at a time
let refreshPromise: Promise<void> | null = null

function silentRefresh(): Promise<void> {
  if (refreshPromise) return refreshPromise
  refreshPromise = fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => {
      if (!r.ok) throw new Error('refresh_failed')
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const headers = isFormData
    ? { ...init?.headers } // let the browser set multipart Content-Type + boundary
    : { 'Content-Type': 'application/json', ...init?.headers }

  const doFetch = () => fetch(`${BASE_URL}${path}`, { ...init, credentials: 'include', headers })

  let res = await doFetch()

  // On 401, attempt a silent token refresh then retry once.
  // Skip for auth endpoints — bad credentials should surface as-is, not trigger a refresh.
  const skipRefresh = ['/auth/refresh', '/auth/login', '/auth/signup']
  if (res.status === 401 && !skipRefresh.some((p) => path.startsWith(p))) {
    try {
      await silentRefresh()
      res = await doFetch()
    } catch {
      // /auth/me returning 401 just means "not logged in" — not an expired session
      if (!path.startsWith('/auth/me')) {
        toast.error(`Session expired — ${path}`)
      }
      throw new ApiRequestError(401, 'Session expired')
    }
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ message: 'Request failed' }))) as ApiError
    // Any 503 means maintenance mode — fire the global event, never show a toast
    if (res.status === 503) {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('crush_maintenance'))
      throw new ApiRequestError(503, 'maintenance')
    }
    const message = err.message ?? 'Request failed'
    const text = Array.isArray(message) ? message.join(', ') : message
    // Suppress toast for 4xx on auth paths — the form shows inline errors already
    if (res.status >= 500 || !path.startsWith('/auth/')) {
      toast.error(text)
    }
    throw new ApiRequestError(res.status, text)
  }

  // 204 No Content, or NestJS returning null as empty body
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return null as T
  return JSON.parse(text) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
}
