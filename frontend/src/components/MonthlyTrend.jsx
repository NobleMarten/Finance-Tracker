import { useState, useEffect } from 'react'
import { usePrefersReducedMotion } from '../hooks/useReducedMotion'

const TRACK_H = 72

/**
 * Compact monthly-total trend (last N months). Pure plot — the section header and
 * the value pill live in the parent (Stats). Reports selection/hover by index:
 * `onSelect(i)` pins a month, `onHover(i|null)` for desktop hover. `active` is the
 * highlighted index. Written on the new design-token utilities.
 */
export default function MonthlyTrend({ data, max, active, onSelect, onHover }) {
  const reduced = usePrefersReducedMotion()
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (reduced) { setAnimated(true); return }
    setAnimated(false)
    const id = setTimeout(() => setAnimated(true), 30)
    return () => clearTimeout(id)
  }, [data, reduced])

  return (
    <div className="flex items-end gap-2" style={{ height: TRACK_H + 20 }}>
      {data.map((m, i) => {
        const isActive = i === active
        const hasData = m.amount > 0
        const h = hasData ? Math.max(4, (m.amount / max) * TRACK_H) : 2
        return (
          <button
            key={`${m.year}-${m.month}`}
            type="button"
            onClick={() => hasData && onSelect?.(i)}
            onMouseEnter={() => hasData && onHover?.(i)}
            onMouseLeave={() => onHover?.(null)}
            className="flex-1 flex flex-col items-center justify-end gap-1.5"
            style={{ height: TRACK_H + 20, cursor: hasData ? 'pointer' : 'default' }}
          >
            <div className="w-full flex items-end justify-center" style={{ height: TRACK_H }}>
              <div
                className="w-full rounded-[4px]"
                style={{
                  maxWidth: 26,
                  height: animated ? h : 0,
                  background: !hasData
                    ? 'var(--bg-elevated)'
                    : isActive
                      ? 'var(--accent)'
                      : 'linear-gradient(180deg, rgba(108,140,255,0.85) 0%, rgba(108,140,255,0.25) 100%)',
                  transition: reduced
                    ? 'background 0.12s'
                    : `height 0.45s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.03}s, background 0.12s`,
                }}
              />
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
            >
              {m.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
