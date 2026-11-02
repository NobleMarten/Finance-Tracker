import { fmtTime, fmtShort, fmtRub, scaledFontSize, titleOf } from '../utils/format'
import { MONTHS_GEN } from '../utils/months'
import CountUp from './CountUp'
import ResponsiveSheet from './ResponsiveSheet'
import { avatarColor } from '../utils/avatar'

/**
 * Drill-down over the Stats area listing an arbitrary set of the month's
 * expenses — one repeated purchase ("Coffee ×12") or the month's large ones.
 * Same shell as DayDetail: a bottom sheet on the phone, a dialog on desktop.
 *
 * - `figures`: small label/value tiles under the total
 * - `note`: one line explaining what the list is
 * - `strip`: { daysInMonth, today? } — draws a day-by-day strip marking when it happened
 * - `shareOf`: month total; when set, each row shows its share of it as a bar
 */
export default function ExpenseListDetail({
  title, subtitle, items, figures = [], note, strip, shareOf,
  sortBy = 'date', onEdit, onClose,
}) {
  const rows = [...items].sort(sortBy === 'amount'
    ? (a, b) => b.amount - a.amount
    : (a, b) => b.ts - a.ts)
  const total = rows.reduce((s, t) => s + t.amount, 0)

  const perDay = new Map()
  if (strip) for (const t of rows) perDay.set(t.ts.getDate(), (perDay.get(t.ts.getDate()) ?? 0) + 1)

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={title}
      dialogClassName="max-w-[500px] h-[min(700px,86vh)]"
      sheetClassName="h-[86dvh]"
    >
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-shrink-0 px-5 pb-3 pt-4 lg:pr-14 lg:pt-6">
        <div className="truncate text-[18px] font-bold tracking-tight">{title}</div>
        {subtitle && <div className="text-[12px] font-medium text-muted-foreground">{subtitle}</div>}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-5">
        {/* Total */}
        <div className="px-5 pb-4">
          <div className="text-[12px] font-semibold text-muted-foreground">Потрачено</div>
          <div
            className="mt-1 whitespace-nowrap font-semibold tracking-[-0.03em]"
            style={{ fontSize: scaledFontSize(total, 34, 22, 7), lineHeight: 1.15 }}
          >
            <CountUp value={total} format={fmtShort} /> ₽
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
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-surface)',
                }}
              >
                <div className="text-[11px] mb-1 truncate" style={{ color: 'var(--text-tertiary)' }}>{f.label}</div>
                <div
                  className="text-[14px] font-medium whitespace-nowrap truncate"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
                >
                  {f.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {strip && <DayStrip daysInMonth={strip.daysInMonth} today={strip.today} perDay={perDay} />}

        {/* Expense list */}
        <div className="mx-4 rounded-2xl bg-card px-4 py-1 shadow-soft">
          {rows.length === 0 ? (
            <p className="text-[13px] pt-6 text-center" style={{ color: 'var(--text-tertiary)' }}>
              В этом месяце здесь пусто
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
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {t.description?.trim() ? t.description.trim()[0].toUpperCase() : '—'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {titleOf(t)}
                      </span>
                      <span className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        {t.ts.getDate()} {MONTHS_GEN[t.ts.getMonth()]} · {fmtTime(t.ts)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-3 flex-shrink-0">
                    {pct !== null && (
                      <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{pct}%</span>
                    )}
                    <span
                      className="text-[15px] font-semibold whitespace-nowrap"
                      style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
                    >
                      {fmtRub(t.amount)}
                    </span>
                  </div>
                </div>
                {pct !== null && (
                  <div className="h-[3px] w-full rounded-full overflow-hidden mt-2.5 ml-[52px]"
                    style={{ background: 'var(--bg-elevated)', width: 'calc(100% - 52px)' }}>
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
    </ResponsiveSheet>
  )
}

/** One cell per day of the month; filled where the purchase happened (brighter = several). */
function DayStrip({ daysInMonth, today, perDay }) {
  return (
    <div className="mx-5 mb-4">
      <div className="text-[11px] mb-2" style={{ color: 'var(--text-tertiary)' }}>Когда</div>
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
