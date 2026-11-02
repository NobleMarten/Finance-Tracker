// Amounts are stored as whole roubles, so every figure in the UI is rendered
// without a fractional part. One formatter instance per shape: constructing
// Intl.NumberFormat is the expensive part, formatting is cheap.
const numFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const rubFmt = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCents = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
})

/** «10 501» — number only, for places that print the ₽ sign separately. */
export function fmtShort(n) {
  return numFmt.format(Math.round(n || 0))
}

/** Same as fmtShort: the old two-decimal variant was the «10,00» inconsistency. */
export const fmtFull = fmtShort

/** «10 501 ₽» */
export function fmtRub(n) {
  return rubFmt.format(Math.round(n || 0))
}

/** «-10 501 ₽» / «+10 ₽» for signed rows. */
export function fmtRubSigned(n, sign = '−') {
  return `${sign}${fmtRub(Math.abs(n))}`
}

/**
 * USD equivalent. Below a dollar shows cents ($0.13), never «$0»;
 * returns null when there is nothing meaningful to show.
 */
export function fmtUsd(rub, rate) {
  if (!rate || !(rub > 0)) return null
  const usd = rub * rate
  if (usd < 0.01) return '<$0.01'
  return usd < 1 ? usdCents.format(usd) : usdWhole.format(usd)
}

export function fmtTime(date) {
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtDateShort(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function scaledFontSize(value, max, min, breakLen) {
  const len = String(Math.round(value)).length
  if (len <= breakLen) return max
  return Math.max(min, max - (len - breakLen) * 3.5)
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export function currentMonth() {
  return new Date().toLocaleDateString('ru-RU', { month: 'long' })
}

/** Empty description placeholder, shared by every list. */
export const NO_TITLE = 'Без названия'

export function titleOf(t) {
  return t?.description?.trim() ? t.description : NO_TITLE
}
