import { useState, useEffect, useRef } from 'react'
import { todayInput } from '../utils/date'
import DateChip from './DateChip'
import Numpad from './Numpad'
import ExpenseForm from './ExpenseForm'

/** Body of the «Новый расход» sheet / dialog. Logic unchanged from the old screen. */
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
    hiddenRef.current?.focus({ preventScroll: true })
  }, [])

  const press = (ch) => {
    navigator.vibrate?.(10)
    if (ch === '←' || ch === 'Backspace') {
      setAmt(a => a.slice(0, -1) || '0')
      return
    }
    if (ch === 'Enter') { submit(); return }
    if (ch === ',') ch = '.'
    if (!/^[\d.]$/.test(ch)) return
    if (ch === '.' && amt.includes('.')) return
    setAmt(a => {
      const next = a === '0' && ch !== '.' ? ch : a + ch
      return next.length > 10 ? a : next
    })
  }

  // Physical keyboard handler on hidden input. Escape / Tab pass through so the
  // sheet can still close and focus can still move.
  const onKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Tab') return
    e.preventDefault()
    press(e.key)
  }

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

  return (
    <ExpenseForm
      desktop={desktop}
      title="Новый расход"
      amt={amt}
      desc={desc}
      onDesc={setDesc}
      ready={ready}
      busy={busy}
      onSubmit={submit}
      submitLabel="Добавить"
      hiddenInput={
        <input
          ref={hiddenRef}
          onKeyDown={onKeyDown}
          readOnly
          className="absolute h-0 w-0 opacity-0 pointer-events-none"
          aria-hidden="true"
          tabIndex={-1}
        />
      }
      dateChip={
        <DateChip
          value={date}
          onChange={setDate}
          changed={backdated}
          onReset={() => setDate(today)}
          // Hand focus back to the hidden input, or the numpad stops taking
          // physical keystrokes once the calendar closes.
          onAfterClose={() => hiddenRef.current?.focus({ preventScroll: true })}
        />
      }
      numpad={<Numpad onPress={press} />}
    />
  )
}
