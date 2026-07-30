import { useState } from 'react'
import { dayLabel, minDateInput, todayInput } from '../utils/date'
import DatePicker from './DatePicker'

/**
 * Compact date selector used by the add and edit screens.
 *
 * Opens the app's own calendar rather than the native `<input type="date">`
 * picker: that one is styled by the browser, looks different on every platform,
 * and on desktop Chrome only responds to clicks on its tiny calendar indicator.
 *
 * `changed` drives the accent highlight — the add screen compares against
 * today, the edit screen against the expense's original date.
 */
export default function DateChip({
  value,
  onChange,
  changed,
  onReset,
  resetLabel = 'reset',
  onAfterClose,
}) {
  const [open, setOpen] = useState(false)

  // Runs whether the calendar was dismissed or a date was picked, so the parent
  // screen can take keyboard focus back for its keypad.
  const close = () => {
    setOpen(false)
    onAfterClose?.()
  }

  return (
    <div className="flex items-center gap-2 mt-4 flex-shrink-0 animate-fade-in delay-2">
      <span
        className="text-[11px] uppercase tracking-[0.16em] font-medium"
        style={{ color: 'var(--text-tertiary)' }}
      >
        date
      </span>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Expense date: ${dayLabel(value)}. Change`}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 active:scale-95"
        style={{
          borderRadius: 'var(--radius-full)',
          background: changed ? 'var(--accent-glow)' : 'var(--bg-surface)',
          border: `1px solid ${changed ? 'var(--accent)' : 'var(--border-muted)'}`,
          color: changed ? 'var(--accent)' : 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {dayLabel(value)}
      </button>

      {changed && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-medium px-2 py-1 transition-colors duration-150"
          style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }}
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
