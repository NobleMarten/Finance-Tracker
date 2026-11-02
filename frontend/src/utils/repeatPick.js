import { titleKey } from './monthInsights'

const WINDOW_DAYS = 30
const DAY_MS = 86_400_000

/**
 * What «Повторить» on the home screen should add.
 *
 * The most frequent title over the last 30 days (a fixed window, so the button
 * follows current habits rather than an old one), ties going to the more recent.
 * The amount comes from the latest purchase with that title: prices drift, the
 * last one is the best guess. If nothing repeated at least twice, falls back to
 * the latest expense. Untitled expenses never win — there is nothing to repeat.
 *
 * `sorted` is newest-first. Returns { amount, description, count } or null.
 */
export function repeatPick(sorted, now = Date.now()) {
  if (sorted.length === 0) return null
  const since = now - WINDOW_DAYS * DAY_MS

  const groups = new Map()
  for (const t of sorted) {
    if (t.ts < since) break // newest-first: everything after is older still
    const key = titleKey(t)
    if (!key) continue
    const g = groups.get(key)
    if (g) g.count++
    // First hit is the latest purchase of this title — keep its amount and spelling.
    else groups.set(key, { latest: t, count: 1 })
  }

  let best = null
  for (const g of groups.values()) {
    if (g.count < 2) continue
    if (!best || g.count > best.count || (g.count === best.count && g.latest.ts > best.latest.ts)) best = g
  }

  const t = best?.latest ?? sorted[0]
  return { amount: t.amount, description: t.description?.trim() ?? '', count: best?.count ?? 1 }
}
