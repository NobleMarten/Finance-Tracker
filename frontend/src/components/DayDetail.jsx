import { Plus } from 'lucide-react'
import { toDateInput, todayInput } from '../utils/date'
import { MONTHS_GEN } from '../utils/months'
import ExpenseListDetail from './ExpenseListDetail'

/** Full day totals come from analytics; operations have their own keyset cursor. */
export default function DayDetail({ day, month, year, total, count, summaryRevision, onEdit, onAddHere, onClose }) {
  const dayName = `${day} ${MONTHS_GEN[month - 1]} ${year}`
  const from = new Date(year, month - 1, day)
  const to = new Date(year, month - 1, day + 1)
  const dateInput = toDateInput(from)
  const canAdd = Boolean(onAddHere) && dateInput <= todayInput()
  return (
    <ExpenseListDetail
      title={dayName}
      filter={{ from: from.toISOString(), to: to.toISOString() }}
      summaryRevision={summaryRevision}
      total={total}
      count={count}
      onEdit={onEdit}
      onClose={onClose}
      action={canAdd && (
        <button type="button" onClick={() => onAddHere(dateInput)}
          aria-label={`Добавить расход: ${dayName}`}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-foreground active:scale-95">
          <Plus className="h-4 w-4" aria-hidden="true" /> Добавить
        </button>
      )}
    />
  )
}
