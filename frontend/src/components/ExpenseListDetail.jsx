import { fmtTime, fmtShort, fmtFull, scaledFontSize } from '../utils/format'
import CountUp from './CountUp'
import DesktopModal from './DesktopModal'
import { avatarColor } from '../utils/avatar'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Drill-down over the Stats area listing an arbitrary set of the month's
 * expenses — one repeated purchase ("Coffee ×12") or the month's large ones.
 * Same shell as DayDetail: full-screen on the phone, a dialog on desktop.
 *
 * - `figures`: small label/value tiles under the total
 * - `note`: one line explaining what the list is
 * - `strip`: { daysInMonth, today? } — draws a day-by-day strip marking when it happened
 * - `shareOf`: month total; when set, each row shows its share of it as a bar
 */
export default function ExpenseListDetail({
  title, subtitle, items, figures = [], note, strip, shareOf,
  sortBy = 'date', onEdit, onClose, desktop = false,
}) {
  const rows = [...items].sort(sortBy === 'amount'
    ? (a, b) => b.amount - a.amount
    : (a, b) => b.ts - a.ts)
  const total = rows.reduce((s, t) => s + t.amount, 0)

  const perDay = new Map()
  if (strip) for (const t of rows) perDay.set(t.ts.getDate(), (perDay.get(t.ts.getDate()) ?? 0) + 1)

  const body = (
    <div
      className={desktop
        ? 'absolute inset-0 flex flex-col'
        : 'absolute inset-0 z-40 flex flex-col animate-fade-in-up'}
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0">
        <button
          onClick={onClose}
          aria-label="Back to stats"
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-90 flex-shrink-0"
          style={{ background: 'var(--overlay)', border: '1px solid var(--border-subtle)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="text-[16px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && (
            <div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</div>
          )}
        </div>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto ${desktop ? 'pb-5' : 'pb-28'}`}>
        {/* Total */}
        <div className="px-5 pb-4">
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
          {note && (
            <div className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {note}
            </div>
          )}
        </div>

        {figures.length > 0 && (
          <div className="mx-5 mb-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))` }}>
            {figures.map(f => (
              <div
                key={f.label}
                className="px-3 py-2.5 min-w-0"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div className="text-[11px] mb-1 truncate" style={{ color: 'var(--text-tertiary)' }}>{f.label}</div>
                <div
                  className="text-[14px] font-medium whitespace-nowrap truncate"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}
                >
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {strip && <DayStrip daysInMonth={strip.daysInMonth} today={strip.today} perDay={perDay} />}

        <div className="mx-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

        {/* Expense list */}
        <div className="px-5">
          {rows.length === 0 ? (
            <p className="text-[13px] pt-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
              Nothing here this month
            </p>
          ) : rows.map((t, i) => {
            const c = avatarColor(t.description)
            const pct = shareOf > 0 ? Math.round((t.amount / shareOf) * 100) : null
            return (
              <div
                key={t.id}
                onClick={() => onEdit?.(t)}
                className="py-3 animate-fade-in transition-all duration-150 hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)] active:scale-[0.99] cursor-pointer rounded-lg"
                style={{
                  borderTop: i > 0 ? '1px solid var(--border-muted)' : 'none',
                  animationDelay: `${Math.min(i, 15) * 0.03}s`,
                }}
              >
                <div className="flex justify-between items-center">
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
                        {t.ts.getDate()} {MONTHS_SHORT[t.ts.getMonth()]} · {fmtTime(t.ts)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-3 flex-shrink-0">
                    {pct !== null && (
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{pct}%</span>
                    )}
                    <span
                      className="text-[15px] font-medium whitespace-nowrap"
                      style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em', fontFamily: 'var(--font-mono)' }}
                    >
                      {fmtShort(t.amount)}
                    </span>
                  </div>
                </div>
                {pct !== null && (
                  <div className="h-[3px] w-full rounded-full overflow-hidden mt-2.5 ml-10"
                    style={{ background: 'var(--bg-elevated)', width: 'calc(100% - 40px)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: 'linear-gradient(90deg, rgba(var(--accent-rgb),0.5) 0%, var(--accent) 100%)' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (!desktop) return body

  return (
    <DesktopModal onClose={onClose} width={520} height="min(700px, 86vh)">
      {body}
    </DesktopModal>
  )
}

/** One cell per day of the month; filled where the purchase happened (brighter = several). */
function DayStrip({ daysInMonth, today, perDay }) {
  return (
    <div className="mx-5 mb-4">
      <div className="text-[11px] mb-2" style={{ color: 'var(--text-tertiary)' }}>When</div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const n = perDay.get(i + 1) ?? 0
          const future = today != null && i + 1 > today
          return (
            <div
              key={i}
              title={n ? `${i + 1}: ×${n}` : `${i + 1}`}
              className="rounded-[2px]"
              style={{
                height: 18,
                background: n === 0
                  ? 'var(--bg-elevated)'
                  : `rgba(var(--accent-rgb),${n > 1 ? 1 : 0.6})`,
                opacity: future ? 0.35 : 1,
              }}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-ghost)' }}>
        <span>1</span><span>{daysInMonth}</span>
      </div>
    </div>
  )
}
