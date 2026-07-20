import { fmtTime, fmtShort, fmtFull, scaledFontSize } from '../utils/format'
import CountUp from './CountUp'

function avatarColor(s) {
  if (!s || s === '—') return { bg: 'var(--bg-elevated)', fg: 'var(--text-tertiary)' }
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0
  }
  let hue = Math.abs(hash) % 320
  if (hue >= 40) hue += 40
  return {
    bg: `hsla(${hue}, 55%, 55%, 0.14)`,
    fg: `hsl(${hue}, 65%, 72%)`,
  }
}

/**
 * Full-screen drill-down over the Stats area listing every expense recorded on a
 * single day. Rows are tappable → open the app-level Edit screen via `onEdit`.
 * The total shown is the sum of the listed rows, so header and list always agree.
 */
export default function DayDetail({ day, month, year, monthName, transactions, onEdit, onClose }) {
  const dayTx = transactions
    .filter(t =>
      t.ts.getFullYear() === year &&
      t.ts.getMonth() + 1 === month &&
      t.ts.getDate() === day
    )
    .sort((a, b) => a.ts - b.ts)

  const total = dayTx.reduce((s, t) => s + t.amount, 0)

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col animate-fade-in-up"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0">
        <button
          onClick={onClose}
          aria-label="Back to stats"
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-90 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-[16px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {day} {monthName} {year}
        </div>
      </div>

      {/* Total */}
      <div className="px-5 pb-4 flex-shrink-0">
        <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Total spent
        </div>
        <div
          className="font-medium whitespace-nowrap"
          style={{
            fontSize: scaledFontSize(total, 34, 22, 7) + 'px',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <CountUp value={total} format={fmtFull} /> ₽
        </div>
        <div className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {dayTx.length} {dayTx.length === 1 ? 'expense' : 'expenses'}
        </div>
      </div>

      <div className="mx-5 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Expense list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-28">
        {dayTx.length === 0 ? (
          <p className="text-[13px] pt-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
            No expenses this day
          </p>
        ) : (
          dayTx.map((t, i) => {
            const c = avatarColor(t.description)
            return (
              <div
                key={t.id}
                onClick={() => onEdit?.(t)}
                className="flex justify-between items-center py-3 animate-fade-in transition-colors duration-150 hover:bg-[var(--bg-elevated)] cursor-pointer rounded-lg"
                style={{
                  borderTop: i > 0 ? '1px solid var(--border-muted)' : 'none',
                  animationDelay: `${i * 0.03}s`,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
                    style={{ background: c.bg, color: c.fg }}
                  >
                    {(t.description || '—')[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-light truncate" style={{ color: 'var(--text-secondary)' }}>
                      {t.description || '—'}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                      {fmtTime(t.ts)}
                    </span>
                  </div>
                </div>
                <span
                  className="text-[15px] font-medium whitespace-nowrap pl-3"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em', fontFamily: 'var(--font-mono)' }}
                >
                  {fmtShort(t.amount)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
