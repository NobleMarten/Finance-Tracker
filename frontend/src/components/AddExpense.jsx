import { useState, useEffect, useRef } from 'react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←']

export default function AddExpense({ onAdd }) {
  const [amt, setAmt] = useState('0')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const hiddenRef = useRef(null)

  // Focus hidden input on mount so physical keyboard works immediately
  useEffect(() => {
    hiddenRef.current?.focus()
  }, [])

  const press = (ch) => {
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
      await onAdd({ amount: Math.round(parseFloat(amt)), description: desc })
      setAmt('0')
      setDesc('')
    } catch (e) {
      console.error('add failed:', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="flex flex-col flex-1 min-h-0 px-6 pt-5"
    >
      {/* hidden input to capture physical keyboard */}
      <input
        ref={hiddenRef}
        onKeyDown={onKeyDown}
        readOnly
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* title */}
      <div className="text-[20px] text-white mb-5 flex-shrink-0 font-light tracking-tight">
        add expense
      </div>

      {/* amount display */}
      <div className="flex-shrink-0">
        <div className="text-[8px] text-[#222] uppercase tracking-[0.16em] mb-2">
          amount · RUB
        </div>
        <div
          className="overflow-hidden whitespace-nowrap leading-none text-white font-light"
          style={{ fontSize: numSize + 'px', letterSpacing: '-0.03em' }}
        >
          {amt}
        </div>
      </div>

      <div className="h-px bg-[#1a1a1a] my-3 flex-shrink-0" />

      {/* description */}
      <input
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="what for? (optional)"
        className="w-full bg-transparent border-none text-[13px] text-[#555] font-light outline-none pb-3 flex-shrink-0 placeholder-[#222]"
      />

      {/* submit */}
      <button
        onClick={submit}
        disabled={!ready || busy}
        className={`w-full py-3 rounded-xl text-[10px] uppercase tracking-widest mb-3 flex-shrink-0 transition-all duration-200 border ${ready
          ? 'bg-white text-[#0b0b0b] border-white cursor-pointer'
          : 'bg-[#141414] text-[#2e2e2e] border-[#1e1e1e] cursor-not-allowed'
          }`}
      >
        {busy ? '...' : 'add expense'}
      </button>

      {/* numpad */}
      <div className="grid grid-cols-3 gap-1.5 flex-1 content-start">
        {KEYS.map((k, i) => {
          const isSym = k === '.' || k === '←'
          return (
            <button
              key={i}
              onClick={() => press(k)}
              className="h-11 bg-[#111] rounded-xl flex items-center justify-center active:opacity-35 transition-opacity"
              style={{
                color: isSym ? '#333' : '#fff',
                fontSize: isSym ? '14px' : '20px',
                fontWeight: 300,
              }}
            >
              {k}
            </button>
          )
        })}
      </div>
    </div>
  )
}
