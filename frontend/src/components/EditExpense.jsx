import { useState, useEffect, useRef } from 'react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←']

export default function EditExpense({ expense, onUpdate, onCancel }) {
  const [amt, setAmt] = useState(String(expense.amount))
  const [desc, setDesc] = useState(expense.description || '')
  const [busy, setBusy] = useState(false)
  const hiddenRef = useRef(null)

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

  const ready = parseFloat(amt) > 0 && 
    (parseFloat(amt) !== expense.amount || desc !== (expense.description || ''))

  const submit = async () => {
    if (!ready || busy) return
    setBusy(true)
    try {
      await onUpdate(expense.id, { amount: Math.round(parseFloat(amt)), description: desc })
      navigator.vibrate?.(30)
    } catch (e) {
      console.error('update failed:', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 px-6 pt-6 bg-[#0b0b0b] absolute inset-0 z-50 animate-fade-in-up">
      {/* header */}
      <div className="flex justify-between items-center mb-5 flex-shrink-0 animate-fade-in">
        <div className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Edit expense
        </div>
        <button 
          onClick={onCancel}
          className="text-[14px] font-medium transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          Cancel
        </button>
      </div>

      {/* hidden input to capture physical keyboard */}
      <input
        ref={hiddenRef}
        onKeyDown={onKeyDown}
        readOnly
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Amount display */}
      <div className="flex-shrink-0 animate-fade-in delay-1">
        <div
          className="text-[11px] uppercase tracking-[0.16em] font-medium mb-3"
          style={{ color: 'var(--text-tertiary)' }}
        >
          amount · RUB
        </div>
        <div
          className="overflow-hidden whitespace-nowrap leading-none font-semibold transition-all duration-150"
          style={{
            fontSize: numSize + 'px',
            letterSpacing: '-0.03em',
            color: amt === '0' ? 'var(--text-ghost)' : 'var(--text-primary)',
          }}
        >
          {amt}
        </div>
      </div>

      <div className="my-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Description input */}
      <input
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="what for? (optional)"
        className="w-full bg-transparent text-[14px] font-light outline-none pb-4 flex-shrink-0 animate-fade-in delay-2"
        style={{
          color: 'var(--text-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          caretColor: 'var(--accent)',
        }}
      />

      {/* Submit button */}
      <button
        onClick={submit}
        disabled={!ready || busy}
        className="w-full py-3.5 text-[11px] uppercase tracking-[0.18em] font-medium mt-4 mb-4 flex-shrink-0 transition-all duration-250 animate-fade-in delay-3"
        style={{
          borderRadius: 'var(--radius-md)',
          background: ready ? 'var(--accent)' : 'var(--bg-surface)',
          color: ready ? '#fff' : 'var(--text-ghost)',
          border: ready ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
          cursor: ready ? 'pointer' : 'not-allowed',
          boxShadow: ready ? '0 0 20px rgba(108, 140, 255, 0.2)' : 'none',
        }}
      >
        {busy ? '...' : 'save changes'}
      </button>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 flex-1 content-start pb-8 animate-fade-in-up delay-4">
        {KEYS.map((k, i) => {
          const isSym = k === '.' || k === '←'
          return (
            <button
              key={i}
              onClick={() => press(k)}
              className="h-14 flex items-center justify-center transition-all duration-150 active:scale-95"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-muted)',
                borderRadius: 'var(--radius-md)',
                color: isSym ? 'var(--text-tertiary)' : 'var(--text-primary)',
                fontSize: isSym ? '16px' : '20px',
                fontWeight: isSym ? 400 : 500,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
            >
              {k}
            </button>
          )
        })}
      </div>
    </div>
  )
}
