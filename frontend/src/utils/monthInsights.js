/**
 * Per-month figures the backend doesn't compute — derived from the full
 * transaction list (operation-level) and the stats' daily totals (day-level).
 */

const LARGE_FACTOR = 3 // an expense is "large" at ≥ 3× the month's median
const FREQUENT_N = 3

/** Grouping key for "same expense": case- and surrounding-space-insensitive title. */
export const titleKey = (t) => (t.description || '').trim().toLowerCase()

function median(sorted) {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

/**
 * @param transactions all transactions (normalized, with `ts: Date`)
 * @param dailyAmounts amount per day, index 0 = day 1, covering the elapsed part
 * @param completedDays days that are fully over (today excluded in the current month)
 */
export function monthInsights({ transactions, month, year, dailyAmounts, completedDays }) {
  const ops = transactions.filter(
    t => t.ts.getFullYear() === year && t.ts.getMonth() + 1 === month,
  )
  const amounts = ops.map(t => t.amount).sort((a, b) => a - b)
  const total = amounts.reduce((s, a) => s + a, 0)
  const count = amounts.length
  const med = median(amounts)

  // No-spend days, over finished days only — an empty "today" isn't one yet.
  let noSpend = 0
  for (let i = 0; i < completedDays; i++) {
    if ((dailyAmounts[i] ?? 0) === 0) noSpend++
  }

  // Large expenses — needs a few operations for "median" to mean anything.
  let large = null
  if (count >= 4 && med > 0) {
    const threshold = med * LARGE_FACTOR
    const big = amounts.filter(a => a >= threshold)
    const bigSum = big.reduce((s, a) => s + a, 0)
    large = {
      threshold,
      sum: bigSum,
      count: big.length,
      share: total > 0 ? Math.round((bigSum / total) * 100) : 0,
    }
  }

  // Most frequent — same title (case/space-insensitive), at least twice.
  const groups = new Map()
  for (const t of ops) {
    const title = (t.description || '').trim()
    if (!title) continue
    const key = titleKey(t)
    const g = groups.get(key) ?? { key, title, count: 0, sum: 0 }
    g.count++
    g.sum += t.amount
    groups.set(key, g)
  }
  const frequent = [...groups.values()]
    .filter(g => g.count >= 2)
    .sort((a, b) => b.count - a.count || b.sum - a.sum)
    .slice(0, FREQUENT_N)

  return {
    ops,
    total,
    count,
    avgCheck: count > 0 ? Math.round(total / count) : 0,
    median: med,
    noSpend,
    completedDays,
    large,
    frequent,
  }
}
