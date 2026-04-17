import { useState } from 'react'
import { fmtFull, fmtShort, fmtTime, scaledFontSize } from '../utils/format'


function getRange(seg, offset) {
  const d = new Date()
  if (seg === 0) {
    const base = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return {
      start: base,
      end: new Date(base.getTime() + 86399999),
      label: days[base.getDay()] + ' ' + base.getDate(),
    }
  }
  if (seg === 1) {
    const base = new Date(d.getFullYear(), d.getMonth() - offset, 1)
    return {
      start: base,
      end: new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59),
      label: base.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
    }
  }
  const y = d.getFullYear() - offset
  return {
    start: new Date(y, 0, 1),
    end: new Date(y, 11, 31, 23, 59, 59),
    label: String(y),
  }
}

export default function History({ transactions }) {
  const [seg, setSeg] = useState(0)
  const [offset, setOffset] = useState(0)

  const { start, end, label } = getRange(seg, offset)
  const filtered = transactions.filter(t => t.ts >= start && t.ts <= end)
  const total = filtered.reduce((s, t) => s + t.amount, 0)

  const handleSeg = (i) => { setSeg(i); setOffset(0) }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* header */}
      <div className="px-6 pt-5 flex-shrink-0">
        <div className="text-[22px] text-white mb-4" style={{ fontStyle: 'italic' }}>
          history
        </div>

        {/* segment */}
        <div className="flex bg-[#111] rounded-lg p-0.5 gap-0.5">
          {['Day', 'Month', 'Year'].map((lbl, i) => (
            <button
              key={lbl}
              onClick={() => handleSeg(i)}
              className={`flex-1 py-1.5 text-[10px] rounded-md transition-colors tracking-wider ${seg === i ? 'bg-[#1e1e1e] text-white' : 'text-[#2e2e2e]'
                }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* nav */}
      <div className="flex items-center justify-between px-6 pt-3 pb-1 flex-shrink-0">
        <button
          onClick={() => setOffset(o => o + 1)}
          className="text-[#2e2e2e] text-xl px-2 py-0.5 leading-none"
        >
          ‹
        </button>
        <span className="text-[13px] text-white">{label}</span>
        <button
          onClick={() => setOffset(o => Math.max(0, o - 1))}
          className={`text-xl px-2 py-0.5 leading-none ${offset === 0 ? 'text-[#1e1e1e]' : 'text-[#2e2e2e]'}`}
        >
          ›
        </button>
      </div>

      {/* total */}
      <div className="px-6 pb-4 flex-shrink-0">
        <div className="text-[8px] text-[#222] uppercase tracking-[0.16em] mb-1.5">total</div>
        <div
          className="text-white leading-none overflow-hidden whitespace-nowrap font-bold"
          style={{ fontSize: scaledFontSize(total, 36, 20, 7) + 'px', letterSpacing: '-0.03em' }}
        >
          {fmtFull(total)}
        </div>
      </div>

      <div className="h-px bg-[#161616] mx-6 flex-shrink-0" />

      {/* list */}
      <div className="flex-1 min-h-0 overflow-hidden px-6">
        {filtered.length === 0 ? (
          <p className="text-[10px] text-[#1e1e1e] text-center py-8">nothing here</p>
        ) : (
          filtered.map(t => (
            <div key={t.id} className="flex items-center py-2.5 border-t border-[#111]">
              <span className="text-[10px] text-[#252525] w-9 flex-shrink-0">{fmtTime(t.ts)}</span>
              <span className="text-[11px] text-[#3a3a3a] flex-1 px-2.5 font-light">{t.description || '—'}</span>
              <span className="text-[14px] text-[#888] whitespace-nowrap">
                {fmtShort(t.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
