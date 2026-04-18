import { useState } from 'react'
import { fmtFull, fmtShort, fmtTime, fmtDateShort, scaledFontSize } from '../utils/format'


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
      {/* Header */}
      <div className="px-6 pt-6 flex-shrink-0 animate-fade-in">
        <div className="text-[22px] font-semibold tracking-tight mb-5" style={{ color: 'var(--text-primary)' }}>
          History
        </div>

        {/* Segment control */}
        <div
          className="flex p-1 gap-1"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {['Day', 'Month', 'Year'].map((lbl, i) => (
            <button
              key={lbl}
              onClick={() => handleSeg(i)}
              className="flex-1 py-2 text-[11px] font-medium tracking-wider transition-all duration-250"
              style={{
                borderRadius: '8px',
                background: seg === i ? 'var(--accent-soft)' : 'transparent',
                color: seg === i ? 'var(--accent)' : 'var(--text-tertiary)',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0 animate-fade-in delay-1">
        <button
          onClick={() => setOffset(o => o + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </span>
        <button
          onClick={() => setOffset(o => Math.max(0, o - 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: offset === 0 ? 'var(--text-ghost)' : 'var(--text-secondary)' }}
          onMouseEnter={e => { if (offset > 0) e.currentTarget.style.background = 'var(--bg-elevated)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Total */}
      <div className="px-6 pb-5 flex-shrink-0 animate-fade-in delay-2">
        <div
          className="text-[11px] uppercase tracking-[0.16em] font-medium mb-2"
          style={{ color: 'var(--text-tertiary)' }}
        >
          total
        </div>
        <div
          className="leading-none overflow-hidden whitespace-nowrap font-semibold"
          style={{
            fontSize: scaledFontSize(total, 38, 22, 7) + 'px',
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
          }}
        >
          {fmtFull(total)}
        </div>
      </div>

      <div className="mx-6 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Transaction list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-ghost)' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              nothing here
            </p>
          </div>
        ) : (
          filtered.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center py-3 animate-fade-in"
              style={{
                borderTop: '1px solid var(--border-muted)',
                animationDelay: `${i * 0.03}s`,
              }}
            >
              <span
                className={`text-[11px] ${seg === 0 ? 'w-10' : 'w-11'} flex-shrink-0 font-medium`}
                style={{ color: 'var(--text-tertiary)' }}
              >
                {seg === 0 ? fmtTime(t.ts) : fmtDateShort(t.ts)}
              </span>
              <span
                className="text-[13px] flex-1 px-3 font-light truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t.description || '—'}
              </span>
              <span
                className="text-[15px] font-medium whitespace-nowrap"
                style={{ color: 'var(--text-primary)' }}
              >
                {fmtShort(t.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
