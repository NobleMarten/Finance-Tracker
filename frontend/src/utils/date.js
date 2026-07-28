/**
 * Helpers for backdating an expense.
 *
 * The API takes `spent_at` as an RFC3339 timestamp with an explicit UTC offset.
 * The browser is the only party that knows the user's timezone, so it builds
 * the instant and the server just parses and validates it — same split that
 * `/api/stats` already uses by passing `tz` from the client.
 */

const pad = (n) => String(n).padStart(2, '0')

/** `YYYY-MM-DD` in local time. Not `toISOString()` — that shifts across midnight. */
export function toDateInput(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayInput() {
  return toDateInput(new Date())
}

/** Floor for the date picker: five years back is well past any useful history. */
export function minDateInput() {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 5)
  return toDateInput(d)
}

/** `+03:00` / `-05:30` for the moment `d` in the current locale. */
function utcOffset(d) {
  const mins = -d.getTimezoneOffset()
  const sign = mins < 0 ? '-' : '+'
  const abs = Math.abs(mins)
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

/**
 * `YYYY-MM-DD` → RFC3339 instant for that calendar day.
 *
 * Today keeps the real wall-clock time, so a fresh expense still shows the
 * minute it happened. A past day is pinned to local noon on purpose: midnight
 * sits close enough to a timezone boundary that a few hours of travel — or a
 * DST shift — would push the expense into the neighbouring day once the server
 * regroups by `tz`. Noon has ~12 hours of slack in both directions.
 */
export function toSpentAt(dateInput) {
  const [y, m, d] = dateInput.split('-').map(Number)
  const at = dateInput === todayInput()
    ? new Date()
    : new Date(y, m - 1, d, 12, 0, 0, 0)

  return (
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` +
    `T${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}` +
    utcOffset(at)
  )
}

/** Human label for the date chip: `today` / `yesterday` / `20 июл`. */
export function dayLabel(dateInput) {
  if (dateInput === todayInput()) return 'today'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateInput === toDateInput(yesterday)) return 'yesterday'

  const [y, m, d] = dateInput.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const opts = { day: 'numeric', month: 'short' }
  if (y !== new Date().getFullYear()) opts.year = 'numeric'
  return date.toLocaleDateString('ru-RU', opts)
}
