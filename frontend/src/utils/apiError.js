/* Тексты короткие намеренно: они уходят и в тост, где места мало.
   Подсказку «что делать» добавляет уже сам OfflineBanner второй строкой. */

/** Сеть не дошла до сервера вообще: fetch отверг промис. */
export const NETWORK_ERROR_MESSAGE = 'Нет связи с сервером'

/** Соединение установилось, но ответа не дождались. */
export const TIMEOUT_ERROR_MESSAGE = 'Сервер не ответил вовремя'

/**
 * Прокси на пути к API (nginx, Cloudflare) отвечают на 502/504 HTML-страницей.
 * Раньше она проходила проверку «не JSON и короче 400 символов» и попадала в
 * интерфейс как есть — пользователь читал вёрстку чужой error-страницы. Теперь
 * такой ответ распознаётся и заменяется человеческим текстом.
 */
function looksLikeHtml(text) {
  return /^\s*<(!doctype|html|head|body|center|h1|title)\b/i.test(text) ||
    /<\/(html|body)>/i.test(text)
}

/**
 * Человеческий текст для ошибки, выброшенной самим `fetch`, а не сервером.
 * `TypeError` — соединение не состоялось (DNS, обрыв, ERR_TIMED_OUT),
 * `AbortError` — сработал наш собственный дедлайн.
 */
export function formatFetchFailure(e) {
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') return TIMEOUT_ERROR_MESSAGE
  return NETWORK_ERROR_MESSAGE
}

/**
 * Parses JSON error body from API: { "code": "...", "message": "..." }
 */
export function parseApiErrorPayload(text) {
  if (text == null || typeof text !== 'string') return null
  const trimmed = text.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const o = JSON.parse(trimmed)
    if (o && typeof o === 'object') {
      const code = typeof o.code === 'string' ? o.code : ''
      const message = typeof o.message === 'string' ? o.message : ''
      if (code || message) return { code, message }
    }
  } catch {
    /* not JSON */
  }
  return null
}

const API_ERROR_RU = {
  EMPTY_TITLE: 'Укажите описание траты.',
  TOO_LONG_TITLE: 'Описание слишком длинное.',
  NEGATIVE_AMOUNT: 'Сумма не может быть отрицательной.',
  INVALID_ID: 'Некорректный идентификатор.',
  INVALID_MONTH: 'Некорректный месяц.',
  INVALID_DATE: 'Выберите дату не в будущем.',
  NOT_FOUND: 'Данные не найдены.',
  NOT_FOUND_EXPENSE: 'Трата не найдена.',
  USER_EXISTS: 'Пользователь с таким email уже зарегистрирован.',
  INCORRECT_PASSWORD: 'Неверный пароль.',
  INVALID_TOKEN: 'Сессия недействительна. Войдите снова.',
  EMPTY_JWT_SECRET: 'Ошибка конфигурации сервера.',
  INTERNAL_SERVER_ERROR: 'Сервис временно недоступен. Попробуйте позже.',
}

/**
 * Human-readable message for any API error (expenses, rate, etc.)
 */
export function formatApiError(text) {
  const p = parseApiErrorPayload(text)
  if (!p) {
    const t = typeof text === 'string' ? text.trim() : ''
    if (t && t.length < 400 && !t.startsWith('{') && !looksLikeHtml(t)) return t
    return 'Произошла ошибка. Попробуйте ещё раз.'
  }
  if (API_ERROR_RU[p.code]) return API_ERROR_RU[p.code]
  if (p.message && p.message.length > 0 && p.message.length < 400) return p.message
  return 'Произошла ошибка. Попробуйте ещё раз.'
}

/**
 * Login / register: не раскрываем, существует ли email (NOT_FOUND vs неверный пароль).
 */
export function formatAuthApiError(text) {
  const p = parseApiErrorPayload(text)
  if (!p) {
    const t = typeof text === 'string' ? text.trim() : ''
    if (t && t.length < 400 && !t.startsWith('{') && !looksLikeHtml(t)) return t
    return 'Не удалось выполнить вход. Попробуйте ещё раз.'
  }
  if (p.code === 'INCORRECT_PASSWORD' || p.code === 'NOT_FOUND') {
    return 'Неверный email или пароль.'
  }
  if (p.code === 'USER_EXISTS') return API_ERROR_RU.USER_EXISTS
  if (p.code === 'INTERNAL_SERVER_ERROR') return API_ERROR_RU.INTERNAL_SERVER_ERROR
  if (p.message && p.message.length > 0 && p.message.length < 400) return p.message
  return 'Не удалось выполнить операцию. Попробуйте ещё раз.'
}
