import { useState, useEffect, useRef } from 'react'
import { toDateInput } from '../utils/date'
import DateChip from './DateChip'
import Numpad from './Numpad'
import ExpenseForm from './ExpenseForm'
import { Trash2 } from 'lucide-react'

/** Body of the «Изменить расход» sheet / dialog. */
export default function EditExpense({ expense, onUpdate, onDelete, desktop = false }) {
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
    hiddenRef.current?.focus({ preventScroll: true })
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
    if (ch === ',') ch = '.'
    if (!/^[\d.]$/.test(ch)) return
    if (ch === '.' && amt.includes('.')) return
    setAmt(a => {
      const next = a === '0' && ch !== '.' ? ch : a + ch
      return next.length > 10 ? a : next
    })
  }

  // Physical keyboard handler on hidden input
  const onKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Tab') return
    e.preventDefault()
    press(e.key)
  }

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

  return (
    <ExpenseForm
      desktop={desktop}
      title="Изменить расход"
      headerExtra={onDelete && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label={confirmDelete ? 'Подтвердить удаление' : 'Удалить расход'}
          className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors ${
            confirmDelete ? 'bg-destructive text-white' : 'bg-destructive/10 text-destructive hover:bg-destructive/15'
          }`}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
          {confirmDelete ? 'Точно удалить?' : 'Удалить'}
        </button>
      )}
      amt={amt}
      desc={desc}
      onDesc={setDesc}
      ready={ready}
      busy={busy}
      onSubmit={submit}
      submitLabel="Сохранить"
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
          changed={dateChanged}
          onReset={() => setDate(originalDate)}
          resetLabel="Вернуть"
          onAfterClose={() => hiddenRef.current?.focus({ preventScroll: true })}
        />
      }
      numpad={<Numpad onPress={press} />}
    />
  )
}
