import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toDateInput, todayInput } from '../utils/date'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Monday-first, matching how History already groups weeks.
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()

/** Monday-first column index for the 1st of the month. */
const leadingBlanks = (y, m) => (new Date(y, m, 1).getDay() + 6) % 7

/**
 * Calendar overlay replacing the native date picker, which looks nothing like
 * the rest of the app and differs per browser.
 *
 * Rendered as a centered modal rather than a popover anchored to the chip: the
 * chip sits mid-screen in both the add and edit flows, so a dropdown would need
 * flip logic to avoid running off the bottom on short viewports.
 *
 * Portalled to document.body on purpose. The screen wrappers animate with
 * `fadeIn`/`fadeInUp`, which animate `transform` — and a transformed ancestor
 * becomes the containing block for `position: fixed` descendants and opens its
 * own stacking context. Left in place, the overlay stays trapped in that
 * subtree and the numpad paints over it no matter how high its z-index is.
 *
 * `min`/`max` are inclusive `YYYY-MM-DD` bounds. Comparing them as strings is
 * safe — ISO dates sort chronologically as text.
 */
export default function DatePicker({ value, min, max, onSelect, onClose }) {
  const [view, setView] = useState(() => {
    const [y, m] = value.split('-').map(Number)
    return { y, m: m - 1 }
  })
  const panelRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Move focus into the panel so Escape and Tab behave predictably, and so the
  // hidden keypad input in the parent screen stops swallowing keystrokes.
  useEffect(() => { panelRef.current?.focus() }, [])

  const today = todayInput()
  const blanks = leadingBlanks(view.y, view.m)
  const total = daysInMonth(view.y, view.m)

  const cellDate = (day) => toDateInput(new Date(view.y, view.m, day))

  const shiftMonth = (delta) => {
    setView(v => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  // A step is pointless if the whole target month falls outside the bounds.
  const prevBlocked = toDateInput(new Date(view.y, view.m, 0)) < min
  const nextBlocked = toDateInput(new Date(view.y, view.m + 1, 1)) > max

  const pick = (day) => {
    const d = cellDate(day)
    if (d < min || d > max) return
    navigator.vibrate?.(10)
    onSelect(d)
    onClose()
  }

  const quick = (offsetDays) => {
    const d = new Date()
    d.setDate(d.getDate() - offsetDays)
    const s = toDateInput(d)
    if (s < min || s > max) return
    onSelect(s)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center px-6 animate-fade-in"
      style={{
        // Inline so no build step can drop it, and above the toast layer.
        zIndex: 400,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Choose date"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[300px] p-4 outline-none animate-scale-in"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
        }}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <NavButton dir="prev" disabled={prevBlocked} onClick={() => shiftMonth(-1)} />
          <div
            className="text-[13px] font-medium tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {MONTHS[view.m]} {view.y}
          </div>
          <NavButton dir="next" disabled={nextBlocked} onClick={() => shiftMonth(1)} />
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(w => (
            <div
              key={w}
              className="h-6 flex items-center justify-center text-[9px] uppercase tracking-[0.1em] font-medium"
              style={{ color: 'var(--text-ghost)' }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: total }, (_, i) => {
            const day = i + 1
            const d = cellDate(day)
            const disabled = d < min || d > max
            const selected = d === value
            const isToday = d === today

            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => pick(day)}
                aria-current={selected ? 'date' : undefined}
                className="h-9 flex items-center justify-center text-[12px] transition-colors duration-100"
                style={{
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: selected ? 600 : 400,
                  background: selected ? 'var(--accent)' : 'transparent',
                  color: selected
                    ? '#fff'
                    : disabled
                      ? 'var(--text-ghost)'
                      : isToday
                        ? 'var(--accent)'
                        : 'var(--text-secondary)',
                  border: !selected && isToday
                    ? '1px solid var(--accent)'
                    : '1px solid transparent',
                  boxShadow: selected ? '0 0 16px var(--accent-glow)' : 'none',
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Shortcuts — backdating usually means "I forgot yesterday". */}
        <div
          className="flex gap-2 mt-4 pt-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <QuickButton label="today" onClick={() => quick(0)} />
          <QuickButton label="yesterday" onClick={() => quick(1)} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

function NavButton({ dir, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous month' : 'Next month'}
      className="w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-90"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-muted)',
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'prev' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}

function QuickButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-2 text-[11px] font-medium transition-colors"
      style={{
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-muted)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}
