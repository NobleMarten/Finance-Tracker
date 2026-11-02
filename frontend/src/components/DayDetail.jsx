import { Plus } from 'lucide-react'
import { fmtShort, scaledFontSize } from '../utils/format'
import { toDateInput, todayInput } from '../utils/date'
import { plural } from '../utils/plural'
import { MONTHS_GEN } from '../utils/months'
import CountUp from './CountUp'
import ResponsiveSheet from './ResponsiveSheet'
import TxRow from './TxRow'

/**
 * Drill-down sheet (dialog on desktop) listing every expense recorded on a
 * single day. Rows are tappable → open the app-level Edit screen via `onEdit`.
 * The total shown is the sum of the listed rows, so header and list always agree.
 *
 * `onAddHere` jumps to the add screen with this day pre-selected — the natural
 * place to record something you forgot, since you are already looking at it.
 *
 * On desktop the very same markup is dropped into a centred dialog instead of
 * covering the whole window — a full-screen takeover for one day's rows would
 * throw away the context the user clicked from.
 */
export default function DayDetail({ day, month, year, transactions, onEdit, onAddHere, onClose }) {
  const dayName = `${day} ${MONTHS_GEN[month - 1]} ${year}`
  const dateInput = toDateInput(new Date(year, month - 1, day))
  const canAdd = Boolean(onAddHere) && dateInput <= todayInput()

  const dayTx = transactions
    .filter(t =>
      t.ts.getFullYear() === year &&
      t.ts.getMonth() + 1 === month &&
      t.ts.getDate() === day
    )
    .sort((a, b) => a.ts - b.ts)

  const total = dayTx.reduce((s, t) => s + t.amount, 0)

  return (
    <ResponsiveSheet
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={dayName}
      dialogClassName="max-w-[480px] h-[min(640px,82vh)]"
      sheetClassName="h-[82dvh]"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-shrink-0 items-center gap-3 px-5 pb-2 pt-4 lg:pr-14 lg:pt-6">
          <div className="text-[18px] font-bold tracking-tight">{dayName}</div>
          {canAdd && (
            <button
              type="button"
              onClick={() => onAddHere(dateInput)}
              aria-label={`Добавить расход: ${dayName}`}
              className="ml-auto flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} /> Добавить
            </button>
          )}
        </div>

        <div className="flex-shrink-0 px-5 pb-4">
          <div className="text-[12px] font-semibold text-muted-foreground">Потрачено</div>
          <div
            className="mt-1 whitespace-nowrap font-semibold tracking-[-0.03em]"
            style={{ fontSize: scaledFontSize(total, 34, 22, 7), lineHeight: 1.15 }}
          >
            <CountUp value={total} format={fmtShort} /> ₽
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {dayTx.length} {plural(dayTx.length, 'трата', 'траты', 'трат')}
          </div>
        </div>

        <div className="mx-4 mb-4 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-card px-4 py-1 shadow-soft">
          {dayTx.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">В этот день трат нет</p>
          ) : (
            dayTx.map((t, i) => <TxRow key={t.id} t={t} onClick={() => onEdit?.(t)} delay={i * 0.03} />)
          )}
        </div>
      </div>
    </ResponsiveSheet>
  )
}
