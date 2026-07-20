import { useRef, useEffect } from 'react'
import { heatColor } from '../utils/heatmap'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CELL = 11
const GAP = 3
const STEP = CELL + GAP
const LABEL_H = 14
const DAY_MS = 86400000

/**
 * GitHub-contributions-style heatmap of daily spending across a whole year.
 * Columns = ISO weeks (Monday-first), rows = weekdays. Built client-side from
 * all transactions. Horizontally scrollable. Tapping a day with spending calls
 * `onSelectDate(year, month, day)` with a 1-based month; hovering a day with
 * spending calls `onHoverDate({ year, month, day, amount })` (null on leave).
 */
export default function YearHeatmap({ transactions, year, onSelectDate, onHoverDate }) {
  const scrollRef = useRef(null)
  // Aggregate spend per calendar day of `year`.
  const byKey = new Map()
  let max = 1
  for (const t of transactions) {
    const d = t.ts
    if (d.getFullYear() !== year) continue
    const key = `${d.getMonth()}-${d.getDate()}`
    const v = (byKey.get(key) || 0) + t.amount
    byKey.set(key, v)
    if (v > max) max = v
  }

  const jan1 = new Date(year, 0, 1)
  // Stop at today for the current year (GitHub-style); full year for past years.
  const today = new Date()
  const endDate = year === today.getFullYear()
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate())
    : new Date(year, 11, 31)
  // Monday on or before Jan 1 — column 0 starts there.
  const startMonday = new Date(year, 0, 1)
  startMonday.setDate(jan1.getDate() - ((jan1.getDay() + 6) % 7))
  const totalDays = Math.round((endDate - startMonday) / DAY_MS) + 1
  const weeks = Math.ceil(totalDays / 7)
  const W = weeks * STEP - GAP
  const H = 7 * STEP - GAP

  const cells = []
  const monthFirstCol = {}
  for (let idx = 0; idx < totalDays; idx++) {
    const date = new Date(startMonday.getTime() + idx * DAY_MS)
    if (date.getFullYear() !== year) continue // skip leading/trailing padding days
    const col = Math.floor(idx / 7)
    const row = idx % 7
    const m = date.getMonth()
    const day = date.getDate()
    if (monthFirstCol[m] === undefined) monthFirstCol[m] = col
    const amount = byKey.get(`${m}-${day}`) || 0
    cells.push({ x: col * STEP, y: row * STEP, m, day, amount })
  }

  // Start scrolled to the right edge so the most recent days (near today) are visible.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [year, W])

  return (
    <div ref={scrollRef} className="overflow-x-auto no-scrollbar">
      <svg width={W} height={H + LABEL_H} style={{ display: 'block' }} role="img" aria-label={`Spending heatmap for ${year}`}>
        {Object.entries(monthFirstCol).map(([m, col]) => (
          <text key={m} x={col * STEP} y={10} fontSize="9" fill="var(--text-tertiary)">
            {MONTHS_SHORT[m]}
          </text>
        ))}
        <g transform={`translate(0, ${LABEL_H})`}>
          {cells.map((c, i) => {
            const hasData = c.amount > 0
            return (
              <rect
                key={i}
                x={c.x}
                y={c.y}
                width={CELL}
                height={CELL}
                rx="2"
                fill={heatColor(c.amount, max)}
                style={{ cursor: hasData ? 'pointer' : 'default' }}
                onClick={() => hasData && onSelectDate?.(year, c.m + 1, c.day)}
                onMouseEnter={() => hasData && onHoverDate?.({ year, month: c.m + 1, day: c.day, amount: c.amount })}
                onMouseLeave={() => onHoverDate?.(null)}
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}
