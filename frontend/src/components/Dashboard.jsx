import { useState, useEffect } from 'react'
import { fmtFull, fmtShort, scaledFontSize, greeting, currentMonth } from '../utils/format'
import { api } from '../api/api'

export default function Dashboard({ transactions }) {
  const [rate, setRate] = useState(null)

  useEffect(() => {
    api.getRate('RUB', 'USD')
      .then(data => setRate(data?.rate ?? null))
      .catch(() => setRate(null))
  }, [])

  const now = new Date()
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const w0 = new Date(d0)
  w0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7))
  const m0 = new Date(now.getFullYear(), now.getMonth(), 1)

  const sum = (f) => transactions.filter(f).reduce((s, t) => s + t.amount, 0)
  const monthVal = sum(t => t.ts >= m0)
  const weekVal = sum(t => t.ts >= w0)
  const dayVal = sum(t => t.ts >= d0)

  const toUSD = (rub) =>
    rate && rub > 0
      ? (rub / rate).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      : null

  const recent = [...transactions].sort((a, b) => b.ts - a.ts).slice(0, 6)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-6 pt-5 flex-shrink-0">
        <span className="text-[10px] text-[#282828] uppercase tracking-widest">{currentMonth()}</span>
      </div>

      <div className="px-6 pt-4 text-[15px] text-[#242424] font-light flex-shrink-0">
        {greeting()}
      </div>

      <div className="px-6 pt-5 pb-5 flex-shrink-0">
        <div className="text-[8px] text-[#222] uppercase tracking-[0.16em] mb-2">this month</div>
        <div
          className="text-white leading-none overflow-hidden whitespace-nowrap font-light"
          style={{ fontSize: scaledFontSize(monthVal, 40, 24, 7) + 'px', letterSpacing: '-0.03em' }}
        >
          {fmtFull(monthVal)}
        </div>
        <div className="flex items-baseline gap-3 mt-2">
          <span className="text-[9px] text-[#232323] uppercase tracking-[0.12em]">USD</span>
          {toUSD(monthVal) && (
            <span className="text-[10px] text-[#282828]">≈ {toUSD(monthVal)}</span>
          )}
        </div>
      </div>

      <div className="h-px bg-[#161616] mx-6 flex-shrink-0" />

      <div className="flex px-6 flex-shrink-0">
        <div className="flex-1 py-3.5">
          <div className="text-[7px] text-[#222] uppercase tracking-[0.14em] mb-1.5">week</div>
          <div className="overflow-hidden whitespace-nowrap text-[#666] font-light"
            style={{ fontSize: scaledFontSize(weekVal, 21, 14, 6) + 'px', letterSpacing: '-0.02em' }}>
            {fmtShort(weekVal)}
          </div>
          {toUSD(weekVal) && <div className="text-[9px] text-[#252525] mt-0.5">{toUSD(weekVal)}</div>}
        </div>
        <div className="flex-1 py-3.5 pl-4 border-l border-[#161616]">
          <div className="text-[7px] text-[#222] uppercase tracking-[0.14em] mb-1.5">today</div>
          <div className="overflow-hidden whitespace-nowrap text-[#666] font-light"
            style={{ fontSize: scaledFontSize(dayVal, 21, 14, 6) + 'px', letterSpacing: '-0.02em' }}>
            {fmtShort(dayVal)}
          </div>
          {toUSD(dayVal) && <div className="text-[9px] text-[#252525] mt-0.5">{toUSD(dayVal)}</div>}
        </div>
      </div>

      <div className="h-px bg-[#161616] mx-6 flex-shrink-0" />

      <div className="flex-1 min-h-0 overflow-hidden px-6">
        <div className="text-[7px] text-[#1e1e1e] uppercase tracking-[0.14em] py-3">recent</div>
        {recent.length === 0 && (
          <p className="text-[11px] text-[#1e1e1e] pt-2">no expenses yet</p>
        )}
        {recent.map(t => (
          <div key={t.id} className="flex justify-between items-center py-2 border-t border-[#111]">
            <span className="text-[11px] text-[#333] font-light">{t.description || '—'}</span>
            <span className="text-[14px] text-[#aaa] font-light" style={{ letterSpacing: '-0.01em' }}>
              {fmtShort(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
