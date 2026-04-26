import { useState, useRef } from 'react'
import { fmtFull, fmtShort, fmtTime, fmtDateShort, scaledFontSize } from '../utils/format'

function groupByWeek(transactions) {
  if (transactions.length === 0) return []

  const sorted = [...transactions].sort((a, b) => a.ts - b.ts)
  const weeks = []
  let currentWeek = null

  for (const t of sorted) {
    const d = new Date(t.ts)
    // Monday of this transaction's week
    const day = d.getDay()
    const diff = (day === 0 ? 6 : day - 1) // days since Monday
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const weekKey = monday.toISOString().slice(0, 10)

    if (!currentWeek || currentWeek.key !== weekKey) {
      const fmtDay = (dt) => dt.getDate()
      const fmtMonth = (dt) => dt.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')

      const label = monday.getMonth() === sunday.getMonth()
        ? `${fmtDay(monday)}–${fmtDay(sunday)} ${fmtMonth(monday)}`
        : `${fmtDay(monday)} ${fmtMonth(monday)} – ${fmtDay(sunday)} ${fmtMonth(sunday)}`

      currentWeek = { key: weekKey, label, items: [], total: 0 }
      weeks.push(currentWeek)
    }

    currentWeek.items.push(t)
    currentWeek.total += t.amount
  }

  // Reverse so newest week is first
  weeks.reverse()
  weeks.forEach(w => w.items.reverse())
  return weeks
}
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

export default function History({ transactions, onDelete, onEdit }) {
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
        ) : seg === 1 ? (
          // Month view — grouped by weeks
          groupByWeek(filtered).map((week, wi) => (
            <div key={wi} className="animate-fade-in" style={{ animationDelay: `${wi * 0.05}s` }}>
              <div
                className="flex items-center justify-between pt-4 pb-2"
                style={{ borderTop: wi > 0 ? '1px solid var(--border-subtle)' : 'none' }}
              >
                <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {week.label}
                </span>
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {fmtShort(week.total)}
                </span>
              </div>
              {week.items.map((t, i) => (
                <SwipeRow key={t.id} onDelete={() => onDelete?.(t.id)} onEdit={() => onEdit?.(t)} index={i}>
                  <span className="text-[11px] w-11 flex-shrink-0 font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    {fmtDateShort(t.ts)}
                  </span>
                  <span className="text-[13px] flex-1 px-3 font-light truncate" style={{ color: 'var(--text-secondary)' }}>
                    {t.description || '—'}
                  </span>
                  <span className="text-[15px] font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                    {fmtShort(t.amount)}
                  </span>
                </SwipeRow>
              ))}
            </div>
          ))
        ) : (
          // Day / Year view — flat list
          filtered.map((t, i) => (
            <SwipeRow key={t.id} onDelete={() => onDelete?.(t.id)} onEdit={() => onEdit?.(t)} index={i}>
              <span
                className={`text-[11px] ${seg === 0 ? 'w-10' : 'w-11'} flex-shrink-0 font-medium`}
                style={{ color: 'var(--text-tertiary)' }}
              >
                {seg === 0 ? fmtTime(t.ts) : fmtDateShort(t.ts)}
              </span>
              <span className="text-[13px] flex-1 px-3 font-light truncate" style={{ color: 'var(--text-secondary)' }}>
                {t.description || '—'}
              </span>
              <span className="text-[15px] font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                {fmtShort(t.amount)}
              </span>
            </SwipeRow>
          ))
        )}
      </div>
    </div>
  )
}

function SwipeRow({ children, onDelete, onEdit, index }) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const rowRef = useRef(null)
  const [swiped, setSwiped] = useState(false)

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    currentX.current = 0
  }

  const onTouchMove = (e) => {
    const dx = e.touches[0].clientX - startX.current
    if (dx > 0) return // only swipe left
    currentX.current = dx
    const clamped = Math.max(dx, -80)
    if (rowRef.current) {
      rowRef.current.style.transform = `translateX(${clamped}px)`
      rowRef.current.style.transition = 'none'
    }
  }

  const onTouchEnd = () => {
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.25s ease-out'
      if (currentX.current < -50) {
        rowRef.current.style.transform = 'translateX(-72px)'
        setSwiped(true)
      } else {
        rowRef.current.style.transform = 'translateX(0)'
        setSwiped(false)
      }
    }
  }

  const resetSwipe = () => {
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.25s ease-out'
      rowRef.current.style.transform = 'translateX(0)'
    }
    setSwiped(false)
  }

  const handleDelete = () => {
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in'
      rowRef.current.style.transform = 'translateX(-100%)'
      rowRef.current.style.opacity = '0'
    }
    setTimeout(() => onDelete?.(), 300)
  }

  return (
    <div
      className="relative overflow-hidden animate-fade-in"
      style={{
        borderTop: '1px solid var(--border-muted)',
        animationDelay: `${index * 0.03}s`,
      }}
    >
      {/* Delete button behind */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[72px] flex items-center justify-center transition-opacity duration-200"
        style={{
          background: '#FF453A',
          borderRadius: '0 4px 4px 0',
          opacity: swiped ? 1 : 0.5,
        }}
      >
        <button
          onClick={handleDelete}
          className="w-full h-full flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>

      {/* Row content */}
      <div
        ref={rowRef}
        className="flex items-center py-3 relative"
        style={{ background: 'var(--bg-base)', zIndex: 1 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => {
          if (swiped) resetSwipe()
          else onEdit?.()
        }}
      >
        {children}
      </div>
    </div>
  )
}
