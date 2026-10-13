import { useState, useEffect } from 'react'
import { usePrefersReducedMotion } from '../hooks/useReducedMotion'
import { fmtShort } from '../utils/format'

/**
 * Compact monthly-total trend (last N months). Pure plot — the section header and
 * the value pill live in the parent (Stats). Reports selection/hover by index:
 * `onSelect(i)` pins a month, `onHover(i|null)` for desktop hover. `active` is the
 * highlighted index. Written on the new design-token utilities.
 *
 * `trackHeight` / `barMax` let the desktop layout run the same plot larger in the
 * space it has, without a second copy of it.
 *
 * `partialIndex` marks the month still in progress: its bar is drawn faded, with
 * a dashed outline up to `forecast`. `avg` draws a dashed reference line.
 */
export default function MonthlyTrend({
  data, max, active, onSelect, onHover, trackHeight = 72, barMax = 26,
  avg = null, partialIndex = null, forecast = null,
}) {
  const TRACK_H = trackHeight
  const LABEL_H = 20
  const reduced = usePrefersReducedMotion()
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (reduced) { setAnimated(true); return }
    setAnimated(false)
    const id = setTimeout(() => setAnimated(true), 30)
    return () => clearTimeout(id)
  }, [data, reduced])

  const scale = (v) => (v / max) * TRACK_H
  const avgY = avg > 0 ? TRACK_H - scale(avg) : null

  return (
    <div>
      <div className="relative">
        {avgY !== null && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-10"
            style={{ top: avgY, borderTop: '1px dashed var(--text-tertiary)', opacity: 0.7 }}
          />
        )}

        <div className="flex gap-2">
          {data.map((m, i) => {
            const isActive = i === active
            const isPartial = i === partialIndex
            const hasData = m.amount > 0
            const h = hasData ? Math.max(4, scale(m.amount)) : 2
            const fh = isPartial && forecast > m.amount ? scale(forecast) : 0
            return (
              <button
                key={`${m.year}-${m.month}`}
                type="button"
                onClick={() => hasData && onSelect?.(i)}
                onMouseEnter={() => hasData && onHover?.(i)}
                onMouseLeave={() => onHover?.(null)}
                className="flex-1 flex flex-col items-center"
                style={{ cursor: hasData ? 'pointer' : 'default' }}
                aria-label={isPartial ? `${m.label}, month in progress` : m.label}
              >
                <div className="relative w-full flex items-end justify-center" style={{ height: TRACK_H }}>
                  {fh > 0 && (
                    <div
                      className="absolute bottom-0 w-full rounded-[4px] pointer-events-none"
                      style={{
                        maxWidth: barMax,
                        height: animated ? fh : 0,
                        border: '1px dashed rgba(var(--accent-rgb),0.55)',
                        background: 'rgba(var(--accent-rgb),0.06)',
                        transition: reduced ? 'none' : `height 0.45s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.03 + 0.1}s`,
                      }}
                    />
                  )}
                  <div
                    className="relative w-full rounded-[4px]"
                    style={{
                      maxWidth: barMax,
                      height: animated ? h : 0,
                      background: !hasData
                        ? 'var(--bg-elevated)'
                        : isActive
                          ? 'var(--accent)'
                          : isPartial
                            ? 'repeating-linear-gradient(135deg, rgba(var(--accent-rgb),0.55) 0 4px, rgba(var(--accent-rgb),0.3) 4px 8px)'
                            : 'linear-gradient(180deg, rgba(var(--accent-rgb),0.85) 0%, rgba(var(--accent-rgb),0.25) 100%)',
                      transition: reduced
                        ? 'background 0.12s'
                        : `height 0.45s cubic-bezier(0.34,1.2,0.64,1) ${i * 0.03}s, background 0.12s`,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-medium flex items-center justify-center gap-1"
                  style={{ height: LABEL_H, color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
                >
                  {m.label}
                  {isPartial && (
                    <span className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {(partialIndex !== null || avgY !== null) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {avgY !== null && (
            <span className="flex items-center gap-1.5">
              <span className="w-3" style={{ borderTop: '1px dashed var(--text-tertiary)' }} />
              avg of full months · <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtShort(avg)} ₽</span>
            </span>
          )}
          {partialIndex !== null && forecast > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[2px]"
                style={{ border: '1px dashed rgba(var(--accent-rgb),0.7)' }} />
              {data[partialIndex].label} so far · forecast {fmtShort(forecast)} ₽
            </span>
          )}
        </div>
      )}
    </div>
  )
}
