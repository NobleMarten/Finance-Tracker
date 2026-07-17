import { formatApiError, formatAuthApiError } from '../utils/apiError'

/**
 * VITE_API_URL should be origin only, e.g. http://host:8081
 * (routes already use /api/...). If env mistakenly ends with /api, strip it
 * so we never call /api/api/register.
 */
function normalizeApiBase(raw) {
  let u = String(raw ?? 'http://localhost:8080').trim()
  u = u.replace(/\/+$/, '')
  if (u.endsWith('/api')) {
    u = u.slice(0, -4).replace(/\/+$/, '')
  }
  return u || 'http://localhost:8080'
}

const BASE = normalizeApiBase(import.meta.env.VITE_API_URL)

/**
 * Auth is now cookie-based (httpOnly `token` cookie set by the backend).
 * JS can no longer read the auth token — the browser attaches it automatically
 * as long as every request opts in with `credentials: 'include'`.
 *
 * CSRF protection: the backend also sets a NON-httpOnly `csrf_token` cookie.
 * For state-changing requests (POST/PATCH/DELETE) we read that cookie and echo
 * it back in the `X-CSRF-Token` header (double-submit pattern). The backend
 * compares the two; a foreign site can send the cookie but cannot read it to
 * set the matching header, so its forged request is rejected.
 */
const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'X-CSRF-Token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function readCookie(name) {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(name + '='))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : ''
}

/** Adds the CSRF header for state-changing methods; safe methods get nothing. */
function csrfHeaders(method) {
  if (SAFE_METHODS.has((method ?? 'GET').toUpperCase())) return {}
  const token = readCookie(CSRF_COOKIE)
  return token ? { [CSRF_HEADER]: token } : {}
}

/**
 * When any request comes back 401 the cookie is missing/expired. Broadcast it
 * so AuthContext can clear the local session and bounce to /login. Using an
 * event keeps api.js free of React/router imports.
 */
function notifyUnauthorized() {
  window.dispatchEvent(new Event('auth:unauthorized'))
}

async function req(path, options = {}) {
  const method = options.method ?? 'GET'
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(method),
      ...options.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401) notifyUnauthorized()
    const text = await res.text()
    throw new Error(formatApiError(text))
  }
  if (res.status === 204) return null
  return res.json()
}

/** Login/register set httpOnly cookies and return an empty body — nothing to parse. */
async function ensureOk(res) {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(formatAuthApiError(text))
  }
}

export const authApi = {
  login: async (email, password) => {
    const res = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    await ensureOk(res)
  },

  register: async (login, email, password) => {
    const res = await fetch(`${BASE}/api/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, email, password }),
    })
    await ensureOk(res)
  },

  logout: async () => {
    // /api/logout is public and CSRF-exempt, but include the header anyway in
    // case it ever moves behind the protected group. credentials so the server
    // sees which session to clear.
    await fetch(`${BASE}/api/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...csrfHeaders('POST') },
    }).catch(() => {})
  },

  /** Заготовка: позже здесь будет отправка ссылки сброса, а не пароля. */
  requestPasswordReset: async (email) => {
    const res = await fetch(`${BASE}/api/auth/forgot-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(formatApiError(text))
    }
    try {
      return text ? JSON.parse(text) : {}
    } catch {
      return {}
    }
  },
}

export const api = {
  getTransactions: () => req('/api/expenses'),
  addTransaction: (data) =>
    req('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id) =>
    req(`/api/expenses/${id}`, { method: 'DELETE' }),
  updateTransaction: (id, data) =>
    req(`/api/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getRate: (from = 'RUB', to = 'USD') =>
    req(`/api/rate?from=${from}&to=${to}`),
  getStats: (month, year) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return req(`/api/stats?month=${month}&year=${year}&limit=3&tz=${encodeURIComponent(tz)}`)
  },
}
