import { useState, useEffect, useRef } from 'react'
import { toDateInput } from '../utils/date'
import DateChip from './DateChip'
import Numpad from './Numpad'
import DesktopModal from './DesktopModal'

export default function EditExpense({ expense, onUpdate, onDelete, onCancel, desktop = false }) {
  const originalDate = toDateInput(expense.ts)
  const [amt, setAmt] = useState(String(expense.amount))
  const [desc, setDesc] = useState(expense.description || '')
  const [date, setDate] = useState(originalDate)
  const [busy, setBusy] = useState(false)
  // Удаление в два касания. В History оно спрятано за свайпом — сам жест
  // защищает от случайного нажатия; у кнопки в шапке такой защиты нет,
  // а промахнуться по соседнему Cancel на телефоне легко.
  const [confirmDelete, setConfirmDelete] = useState(false)
  const hiddenRef = useRef(null)

  // Focus hidden input on mount so physical keyboard works immediately
  useEffect(() => {
    hiddenRef.current?.focus()
  }, [])

  // Взведённое подтверждение само снимается: иначе оно останется висеть, и
  // следующее касание — уже с другим намерением — удалит трату.
  useEffect(() => {
    if (!confirmDelete) return
    const id = setTimeout(() => setConfirmDelete(false), 3000)
    return () => clearTimeout(id)
  }, [confirmDelete])

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

  const dateChanged = date !== originalDate

  const ready = parseFloat(amt) > 0 &&
    (parseFloat(amt) !== expense.amount || desc !== (expense.description || '') || dateChanged)

  const submit = async () => {
    if (!ready || busy) return
    setBusy(true)
    try {
      const payload = { amount: Math.round(parseFloat(amt)), description: desc }
      // Only send the date when it actually moved. `baseTs` keeps the recorded
      // time of day so editing shifts the day and nothing else.
      if (dateChanged) {
        payload.date = date
        payload.baseTs = expense.ts
      }
      await onUpdate(expense.id, payload)
      navigator.vibrate?.(30)
    } catch (e) {
      console.error('update failed:', e)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (busy) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      navigator.vibrate?.(10)
      return
    }
    setBusy(true)

    let ok = false
    try {
      ok = await onDelete(expense.id)
    } catch (e) {
      console.error('delete failed:', e)
    }

    if (ok) {
      navigator.vibrate?.(30)
      // При успехе экран закрывается родителем, поэтому busy не снимаем —
      // иначе кнопки на мгновение оживут на уже удалённой трате.
      return
    }

    setConfirmDelete(false)
    setBusy(false)
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

  const header = (
    <div className={`flex justify-between items-center flex-shrink-0 ${desktop ? '' : 'mb-5 animate-fade-in'}`}>
      <div className={`${desktop ? 'text-[18px]' : 'text-[22px]'} font-semibold tracking-tight`}
        style={{ color: 'var(--text-primary)' }}>
        Edit expense
      </div>
      <div className="flex items-center gap-4">
        {onDelete && (
          <button
            onClick={remove}
            disabled={busy}
            aria-label={confirmDelete ? 'Confirm delete' : 'Delete expense'}
            className="text-[14px] font-medium transition-colors"
            style={{
              color: confirmDelete ? '#FF6F91' : 'var(--text-tertiary)',
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {confirmDelete ? 'sure?' : 'Delete'}
          </button>
        )}
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
    </div>
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
      changed={dateChanged}
      onReset={() => setDate(originalDate)}
      resetLabel="undo"
      onAfterClose={() => hiddenRef.current?.focus()}
    />
  )

  const saveButton = (className, glow) => (
    <button
      onClick={submit}
      disabled={!ready || busy}
      className={className}
      style={{
        borderRadius: 'var(--radius-md)',
        background: ready ? 'var(--accent)' : 'var(--bg-surface)',
        color: ready ? '#fff' : 'var(--text-ghost)',
        border: ready ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
        cursor: ready ? 'pointer' : 'not-allowed',
        boxShadow: ready ? glow : 'none',
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy ? <span className="animate-spin-btn" /> : 'save changes'}
    </button>
  )

  if (desktop) {
    return (
      <DesktopModal onClose={onCancel} width={780} height="auto">
        {hiddenInput}
        <div className="p-7">
          {header}

          <div className="grid grid-cols-[1fr_auto] gap-9 mt-6">
            {/* Form column */}
            <div className="min-w-0 flex flex-col">
              <div className="text-[11px] uppercase tracking-[0.16em] font-medium mb-3"
                style={{ color: 'var(--text-tertiary)' }}>
                amount · RUB
              </div>
              <div
                className="overflow-hidden whitespace-nowrap leading-none font-medium transition-all duration-150"
                style={{
                  fontSize: numSize + 'px',
                  letterSpacing: '-0.02em',
                  color: amt === '0' ? 'var(--text-ghost)' : 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {amt}
              </div>

              <div className="my-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {descInput('w-full bg-transparent text-[15px] font-light outline-none pb-3')}

              {dateChip}

              <div className="flex-1 min-h-[16px]" />

              {saveButton(
                'w-full py-3.5 text-[11px] uppercase tracking-[0.18em] font-medium mt-6 transition-all duration-200 flex items-center justify-center gap-2',
                '0 4px 20px var(--accent-glow)',
              )}
            </div>

            <Numpad onPress={press} size={64} gap="gap-3" />
          </div>
        </div>
      </DesktopModal>
    )
  }

  return (
    <div
      className="flex flex-col flex-1 min-h-0 px-6 absolute inset-0 z-50 animate-fade-in-up"
      style={{
        background: 'var(--bg-base)',
        paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* header */}
      {header}

      {/* hidden input to capture physical keyboard */}
      {hiddenInput}

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
      {saveButton(
        'w-full py-3.5 text-[11px] uppercase tracking-[0.18em] font-medium mt-4 mb-4 flex-shrink-0 transition-all duration-200 animate-fade-in delay-3 flex items-center justify-center gap-2',
        '0 0 20px var(--accent-glow)',
      )}

      {/* Numpad */}
      <Numpad
        onPress={press}
        className="flex-1 content-start pb-8 animate-fade-in-up delay-4"
      />
    </div>
  )
}
