import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { dayLabel, minDateInput, todayInput } from '../utils/date'
import DatePicker from './DatePicker'
import { cn } from '@/lib/utils'

/**
 * Compact date selector used by the add and edit forms.
 *
 * Opens the app's own calendar rather than the native `<input type="date">`
 * picker: that one is styled by the browser, looks different on every platform,
 * and on desktop Chrome only responds to clicks on its tiny calendar indicator.
 *
 * `changed` drives the highlight — the add form compares against today, the
 * edit form against the expense's original date.
 */
export default function DateChip({
  value,
  onChange,
  changed,
  onReset,
  resetLabel = 'Сбросить',
  onAfterClose,
}) {
  const [open, setOpen] = useState(false)

  // Runs whether the calendar was dismissed or a date was picked, so the parent
  // form can take keyboard focus back for its keypad.
  const close = () => {
    setOpen(false)
    onAfterClose?.()
  }

  return (
    <div className="mt-3 flex flex-shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Дата расхода: ${dayLabel(value)}. Изменить`}
        aria-haspopup="dialog"
        className={cn(
          'flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-150 active:scale-95',
          changed ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/75 shadow-soft ring-1 ring-black/[0.03] hover:bg-muted',
        )}
      >
        <CalendarDays className="h-4 w-4" strokeWidth={2} />
        {dayLabel(value)[0].toUpperCase() + dayLabel(value).slice(1)}
      </button>

      {changed && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {resetLabel}
        </button>
      )}

      {open && (
        <DatePicker
          value={value}
          min={minDateInput()}
          max={todayInput()}
          onSelect={onChange}
          onClose={close}
        />
      )}
    </div>
  )
}
