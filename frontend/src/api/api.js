import { AUTH_TOKEN_KEY } from '../constants/authStorage'
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

function authHeaders() {
  const t = localStorage.getItem(AUTH_TOKEN_KEY)
  if (!t) return {}
  return { Authorization: `Bearer ${t}` }
}

async function parseAuthToken(res) {
  const text = await res.text()
  if (!res.ok) {
    throw new Error(formatAuthApiError(text))
  }
  if (!text) throw new Error('Empty response')
  let body
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error('Invalid server response')
  }
  const token = typeof body === 'string' ? body : body?.token
  if (typeof token !== 'string' || !token) {
    throw new Error('No token in response')
  }
  return token
}

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(formatApiError(text))
  }
  if (res.status === 204) return null
  return res.json()
}

export const authApi = {
  login: (email, password) =>
    fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(parseAuthToken),

  register: (login, email, password) =>
    fetch(`${BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, email, password }),
    }).then(parseAuthToken),

  /** Заготовка: позже здесь будет отправка ссылки сброса, а не пароля. */
  requestPasswordReset: async (email) => {
    const res = await fetch(`${BASE}/api/auth/forgot-password`, {
      method: 'POST',
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
  getStats: (month, year) =>
    req(`/api/stats?month=${month}&year=${year}&limit=3`),
}
