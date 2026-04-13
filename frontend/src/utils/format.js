export function fmtFull(n) {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function fmtShort(n) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

export function fmtTime(date) {
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function scaledFontSize(value, max, min, breakLen) {
  const len = String(Math.round(value)).length
  if (len <= breakLen) return max
  return Math.max(min, max - (len - breakLen) * 3.5)
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 5 || h >= 22) return 'good night'
  if (h < 12) return 'good morning'
  if (h < 18) return 'good afternoon'
  return 'good evening'
}

export function currentMonth() {
  return new Date().toLocaleDateString('ru-RU', { month: 'long' })
}
