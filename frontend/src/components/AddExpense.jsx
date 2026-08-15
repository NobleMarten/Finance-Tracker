import { useState, useEffect, useRef } from 'react'
import { todayInput } from '../utils/date'
import DateChip from './DateChip'
import Numpad from './Numpad'

export default function AddExpense({ onAdd, initialDate, desktop = false }) {
  const [amt, setAmt] = useState('0')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(() => initialDate ?? todayInput())
  const [busy, setBusy] = useState(false)
  const hiddenRef = useRef(null)

  const today = todayInput()
  const backdated = date !== today

  // Focus hidden input on mount so physical keyboard works immediately
  useEffect(() => {
    hiddenRef.current?.focus()
  }, [])

  const press = (ch) => {
    navigator.vibrate?.(10)
    if (ch === '←' || ch === 'Backspace') {
      setAmt(a => a.slice(0, -1) || '0')
      return
    }
    if (ch === 'Enter') { submit(); return }
    if (!/[\d.]/.test(ch)) return
    if (ch === '.' && amt.includes('.')) return
    setAmt(a => {
      const next = a === '0' ? ch : a + ch
      return next.length > 10 ? a : next
    })
  }

  // Physical keyboard handler on hidden input
  const onKeyDown = (e) => {
    e.preventDefault()
    press(e.key)
  }

  const numSize =
    amt.length > 9 ? 28 :
      amt.length > 7 ? 36 :
        amt.length > 5 ? 44 : 52

  const ready = parseFloat(amt) > 0

  const submit = async () => {
    if (!ready || busy) return
    setBusy(true)
    try {
      await onAdd({ amount: Math.round(parseFloat(amt)), description: desc, date })
      navigator.vibrate?.(30)
      setAmt('0')
      setDesc('')
      setDate(today)
    } catch (e) {
      console.error('add failed:', e)
    } finally {
      setBusy(false)
    }
  }

  const hiddenInput = (
    <input
      ref={hiddenRef}
      onKeyDown={onKeyDown}
      readOnly
      className="absolute opacity-0 w-0 h-0 pointer-events-none"
      aria-hidden="true"
    />
  )

  const descInput = (className) => (
    <input
      value={desc}
      onChange={e => setDesc(e.target.value)}
      placeholder="what for? (optional)"
      className={className}
      style={{
        color: 'var(--text-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        caretColor: 'var(--accent)',
      }}
    />
  )

  const dateChip = (
    <DateChip
      value={date}
      onChange={setDate}
      changed={backdated}
      onReset={() => setDate(today)}
      // Hand focus back to the hidden input, or the numpad stops taking
      // physical keystrokes once the calendar closes.
      onAfterClose={() => hiddenRef.current?.focus()}
    />
  )

  if (desktop) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        {hiddenInput}
        <div className="mx-auto w-full max-w-[900px] min-h-full px-10 py-10 flex flex-col justify-center">
          <h1 className="text-[26px] font-semibold tracking-tight mb-6 animate-fade-in"
            style={{ color: 'var(--text-primary)' }}>
            Add expense
          </h1>

          <div
            className="grid grid-cols-[1fr_auto] gap-10 p-8 animate-fade-in delay-1"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Form column */}
            <div className="min-w-0 flex flex-col">
              <div className="text-[11px] uppercase tracking-[0.16em] font-medium mb-3"
                style={{ color: 'var(--text-tertiary)' }}>
                amount · RUB
              </div>
              <div
                className="overflow-hidden whitespace-nowrap leading-none font-medium transition-all duration-150"
                style={{
                  fontSize: (numSize + 12) + 'px',
                  letterSpacing: '-0.02em',
                  color: amt === '0' ? 'var(--text-ghost)' : 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {amt}
              </div>

              <div className="my-6" style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {descInput('w-full bg-transparent text-[15px] font-light outline-none pb-3')}

              {dateChip}

              <div className="flex-1 min-h-[24px]" />

              <button
                onClick={submit}
                disabled={!ready || busy}
                className="w-full py-3.5 text-[11px] uppercase tracking-[0.18em] font-medium mt-6 transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  borderRadius: 'var(--radius-md)',
                  background: ready ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: ready ? '#fff' : 'var(--text-ghost)',
                  border: ready ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                  cursor: ready ? 'pointer' : 'not-allowed',
                  boxShadow: ready ? '0 4px 20px var(--accent-glow)' : 'none',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? <span className="animate-spin-btn" /> : 'add expense'}
              </button>

              <p className="text-[11px] mt-3 text-center" style={{ color: 'var(--text-ghost)' }}>
                type digits on your keyboard · Enter to save · Backspace to correct
              </p>
            </div>

            {/* Keypad column — still useful with a mouse, and it anchors the layout */}
            <Numpad onPress={press} size={72} gap="gap-4" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-6 pt-6">
      {/* hidden input to capture physical keyboard */}
      {hiddenInput}

      {/* Title */}
      <div
        className="text-[22px] font-semibold tracking-tight mb-5 flex-shrink-0 animate-fade-in"
        style={{ color: 'var(--text-primary)' }}
      >
        Add expense
      </div>

      {/* Amount display */}
      <div className="flex-shrink-0 animate-fade-in delay-1">
        <div
          className="text-[11px] uppercase tracking-[0.16em] font-medium mb-3"
          style={{ color: 'var(--text-tertiary)' }}
        >
          amount · RUB
        </div>
        <div
          className="overflow-hidden whitespace-nowrap leading-none font-medium transition-all duration-150"
          style={{
            fontSize: numSize + 'px',
            letterSpacing: '-0.01em',
            color: amt === '0' ? 'var(--text-ghost)' : 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {amt}
        </div>
      </div>

      <div className="my-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Description input */}
      {descInput('w-full bg-transparent text-[14px] font-light outline-none pb-4 flex-shrink-0 animate-fade-in delay-2')}

      {dateChip}

      {/* Submit button */}
      <button
        onClick={submit}
        disabled={!ready || busy}
        className="w-full py-3.5 text-[11px] uppercase tracking-[0.18em] font-medium mt-4 mb-4 flex-shrink-0 transition-all duration-200 animate-fade-in delay-3 flex items-center justify-center gap-2"
        style={{
          borderRadius: 'var(--radius-md)',
          background: ready ? 'var(--accent)' : 'var(--bg-surface)',
          color: ready ? '#fff' : 'var(--text-ghost)',
          border: ready ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
          cursor: ready ? 'pointer' : 'not-allowed',
          boxShadow: ready ? '0 0 20px var(--accent-glow)' : 'none',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? <span className="animate-spin-btn" /> : 'add expense'}
      </button>

      {/* Numpad */}
      <Numpad
        onPress={press}
        className="flex-1 content-start pb-24 animate-fade-in-up delay-4"
      />
    </div>
  )
}
