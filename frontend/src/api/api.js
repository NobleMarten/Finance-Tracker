import { formatApiError, formatAuthApiError, formatFetchFailure } from '../utils/apiError'

/**
 * По умолчанию API живёт на том же origin, что и фронт: запросы уходят
 * относительными путями (`/api/...`), а до бэкенда их доводит nginx.
 *
 * Так адрес не приходится знать на этапе сборки. Vite подставляет import.meta.env
 * в момент `npm run build`, то есть значение вмораживается в бандл: собранный
 * образ с зашитым `http://localhost:8080` ходил бы на localhost *браузера*
 * пользователя, а не сервера. Относительный путь от домена не зависит вовсе —
 * один и тот же образ работает и локально, и на VPS.
 *
 * VITE_API_URL оставлен как аварийный выход на случай, когда фронт и бэкенд
 * действительно на разных origin. В обычной сборке переменная пустая. Локальная
 * разработка тоже обходится без неё: dev-сервер проксирует /api по настройке
 * в vite.config.js.
 */
function normalizeApiBase(raw) {
  let u = String(raw ?? '').trim().replace(/\/+$/, '')
  if (!u) return ''
  // Если в переменную по ошибке вписали хвост /api, убираем его —
  // маршруты ниже добавляют его сами, иначе получится /api/api/register.
  if (u.endsWith('/api')) {
    u = u.slice(0, -4).replace(/\/+$/, '')
  }
  return u
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

/**
 * Свой дедлайн на запрос.
 *
 * Без него запрос висит на таймауте самого Chrome — это до полутора минут, и
 * заканчивается `TypeError: Failed to fetch`, который раньше уходил в тост как
 * есть. Двадцать секунд с внятным текстом лучше: типичный ответ приходит за
 * 65 мс, так что порог не мешает даже медленной мобильной сети.
 *
 * Важная оговорка про POST/PATCH: обрыв по дедлайну не означает, что сервер
 * запрос не выполнил — ответ мог потеряться уже на обратном пути. Так же ведёт
 * себя и таймаут браузера, поэтому хуже не стало, но повторять мутацию после
 * такой ошибки всё равно небезопасно.
 */
const REQUEST_TIMEOUT_MS = 20_000

async function fetchWithDeadline(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (e) {
    // Сетевой сбой и дедлайн — не ошибки API, у них нет тела с кодом.
    throw new Error(formatFetchFailure(e))
  } finally {
    clearTimeout(timer)
  }
}

async function req(path, options = {}) {
  const method = options.method ?? 'GET'
  const res = await fetchWithDeadline(`${BASE}${path}`, {
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
    const res = await fetchWithDeadline(`${BASE}/api/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    await ensureOk(res)
  },

  register: async (login, email, password) => {
    const res = await fetchWithDeadline(`${BASE}/api/register`, {
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
    await fetchWithDeadline(`${BASE}/api/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...csrfHeaders('POST') },
    }).catch(() => {})
  },

  /** Заготовка: позже здесь будет отправка ссылки сброса, а не пароля. */
  requestPasswordReset: async (email) => {
    const res = await fetchWithDeadline(`${BASE}/api/auth/forgot-password`, {
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

/**
 * Персональные API-токены для машинных клиентов (iOS Shortcuts).
 *
 * Управление токенами доступно только по сессионной куке — сервер отвечает 403
 * на попытку сделать это самим токеном. Поэтому здесь обычный `req`, с куками
 * и CSRF-заголовком, как везде.
 *
 * `create` — единственный вызов, возвращающий plaintext. Сервер его больше
 * никогда не отдаст, в базе лежит только хеш.
 */
export const tokensApi = {
  list: () => req('/api/v1/tokens'),
  create: (name) =>
    req('/api/v1/tokens', { method: 'POST', body: JSON.stringify({ name }) }),
  revoke: (id) =>
    req(`/api/v1/tokens/${id}`, { method: 'DELETE' }),
}
