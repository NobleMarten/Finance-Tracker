import { useState, useRef, useCallback, useEffect } from 'react'
import { fmtFull, fmtShort, fmtTime, fmtDateShort, scaledFontSize } from '../utils/format'
import CountUp from './CountUp'
import PullToRefresh from './PullToRefresh'

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

const SEGMENTS = ['Day', 'Month', 'Year']

export default function History({ transactions, loading, onDelete, onEdit, onRefresh, desktop = false }) {
  const [seg, setSeg] = useState(0)
  const [offset, setOffset] = useState(0)

  const { start, end, label } = getRange(seg, offset)
  const filtered = transactions.filter(t => t.ts >= start && t.ts <= end).sort((a, b) => b.ts - a.ts)
  const total = filtered.reduce((s, t) => s + t.amount, 0)

  const handleSeg = (i) => { setSeg(i); setOffset(0) }

  const touchStart = useRef(0)
  const swiping = useRef(false)
  // Строки теперь открывают редактирование по клику, а `touch-action: pan-y`
  // означает, что горизонтальный жест для браузера не прокрутка — по touchend
  // он дошлёт click на ту строку, с которой начался свайп. Раньше жест забирал
  // себе SwipeRow, теперь глотать этот click приходится явно.
  const suppressClick = useRef(false)

  const onTouchStart = useCallback((e) => {
    touchStart.current = e.touches[0].clientX
    swiping.current = false
    suppressClick.current = false
  }, [])

  const onTouchMove = useCallback((e) => {
    if (!swiping.current && Math.abs(e.touches[0].clientX - touchStart.current) > 10) {
      swiping.current = true
    }
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (!swiping.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    const THRESHOLD = 50
    if (dx > THRESHOLD) {
      setOffset(o => o + 1) // swipe right → go back in time
    } else if (dx < -THRESHOLD) {
      setOffset(o => Math.max(0, o - 1)) // swipe left → go forward in time
    }
    // Даже недотянутый до порога свайп не должен открывать трату: намерение
    // было листать, а не редактировать.
    suppressClick.current = true
    swiping.current = false
  }, [])

  const onClickCapture = useCallback((e) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    e.stopPropagation()
    e.preventDefault()
  }, [])

  // Arrow keys walk through periods — the desktop equivalent of the swipe below.
  useEffect(() => {
    if (!desktop) return
    const onKey = (e) => {
      if (e.target.matches?.('input, textarea')) return
      if (e.key === 'ArrowLeft') setOffset(o => o + 1)
      else if (e.key === 'ArrowRight') setOffset(o => Math.max(0, o - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [desktop])

  if (desktop) {
    return (
      <DesktopHistory
        seg={seg}
        onSeg={handleSeg}
        offset={offset}
        setOffset={setOffset}
        label={label}
        total={total}
        filtered={filtered}
        loading={loading && transactions.length === 0}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    )
  }

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClickCapture={onClickCapture}
      style={{ touchAction: 'pan-y' }}
    >
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
          {SEGMENTS.map((lbl, i) => (
            <button
              key={lbl}
              onClick={() => handleSeg(i)}
              className="flex-1 py-2 text-[11px] font-medium tracking-wider transition-all duration-200 active:scale-95"
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
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-secondary)' }}
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
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 ${offset > 0 ? 'hover:bg-[var(--bg-elevated)]' : 'cursor-default'}`}
          style={{ color: offset === 0 ? 'var(--text-ghost)' : 'var(--text-secondary)' }}
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
          className="whitespace-nowrap font-medium"
          style={{
            fontSize: scaledFontSize(total, 38, 22, 7) + 'px',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <CountUp value={total} format={fmtFull} />
        </div>
      </div>

      <div className="mx-6 flex-shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Transaction list */}
      <PullToRefresh onRefresh={onRefresh} className="flex-1 min-h-0 overflow-y-auto px-6 pb-28">
        {loading && transactions.length === 0 ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
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
                className="flex items-center justify-between px-3 py-2.5 mt-3 mb-1"
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm, 10px)',
                  border: '1px solid var(--border-subtle)',
                  borderLeft: '3px solid var(--accent)',
                  marginTop: wi === 0 ? '8px' : '16px',
                }}
              >
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {week.label}
                </span>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>
                  {fmtShort(week.total)}
                </span>
              </div>
              {week.items.map((t, i) => (
                <Row key={t.id} onEdit={() => onEdit?.(t)} index={i}>
                  <span className="text-[11px] w-11 flex-shrink-0 font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    {fmtDateShort(t.ts)}
                  </span>
                  <span className="text-[13px] flex-1 px-3 font-light truncate" style={{ color: 'var(--text-secondary)' }}>
                    {t.description || '—'}
                  </span>
                  <span className="text-[15px] font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {fmtShort(t.amount)}
                  </span>
                </Row>
              ))}
            </div>
          ))
        ) : (
          // Day / Year view — flat list
          filtered.map((t, i) => (
            <Row key={t.id} onEdit={() => onEdit?.(t)} index={i}>
              <span
                className={`text-[11px] ${seg === 0 ? 'w-10' : 'w-11'} flex-shrink-0 font-medium`}
                style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
              >
                {seg === 0 ? fmtTime(t.ts) : fmtDateShort(t.ts)}
              </span>
              <span className="text-[13px] flex-1 px-3 font-light truncate" style={{ color: 'var(--text-secondary)' }}>
                {t.description || '—'}
              </span>
              <span className="text-[15px] font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {fmtShort(t.amount)}
              </span>
            </Row>
          ))
        )}
      </PullToRefresh>
    </div>
  )
}

/* ────────────────────────── desktop ────────────────────────── */

/**
 * Wide layout. The period picker and the total move into a fixed side rail so
 * they stay put while the list scrolls, and the list itself gets a real table
 * shape — time, description, amount in aligned columns — instead of the phone's
 * cramped three-part row.
 */
function DesktopHistory({ seg, onSeg, offset, setOffset, label, total, filtered, loading, onDelete, onEdit }) {
  const weeks = seg === 1 ? groupByWeek(filtered) : null

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="mx-auto w-full max-w-[1480px] px-10 pt-8 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0 animate-fade-in">
          <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            History
          </h1>
          <div
            className="flex p-1 gap-1"
            style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {SEGMENTS.map((lbl, i) => (
              <button
                key={lbl}
                onClick={() => onSeg(i)}
                className="px-5 py-1.5 text-[12px] font-medium transition-all duration-200"
                style={{
                  borderRadius: '9px',
                  background: seg === i ? 'var(--accent-soft)' : 'transparent',
                  color: seg === i ? 'var(--accent)' : 'var(--text-tertiary)',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6 flex-1 min-h-0 pb-8">
          {/* Side rail — period + total */}
          <aside className="w-[280px] flex-shrink-0 flex flex-col gap-4 animate-fade-in delay-1">
            <div
              className="p-5"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <PeriodBtn onClick={() => setOffset(o => o + 1)} label="Previous period">
                  <polyline points="15 18 9 12 15 6" />
                </PeriodBtn>
                <span
                  className="text-[13px] font-medium text-center px-2 truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {label}
                </span>
                <PeriodBtn
                  onClick={() => setOffset(o => Math.max(0, o - 1))}
                  disabled={offset === 0}
                  label="Next period"
                >
                  <polyline points="9 18 15 12 9 6" />
                </PeriodBtn>
              </div>

              <div
                className="text-[11px] uppercase tracking-[0.16em] font-medium mb-2"
                style={{ color: 'var(--text-tertiary)' }}
              >
                total
              </div>
              <div
                className="whitespace-nowrap font-medium leading-none"
                style={{
                  fontSize: scaledFontSize(total, 34, 20, 8) + 'px',
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <CountUp value={total} format={fmtShort} /> ₽
              </div>
              <div className="text-[12px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
                {filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'}
              </div>
            </div>

            <p className="text-[11px] leading-relaxed px-1" style={{ color: 'var(--text-ghost)' }}>
              ← → arrow keys move between periods
            </p>
          </aside>

          {/* List */}
          <section
            className="flex-1 min-w-0 flex flex-col animate-fade-in delay-2 overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              className="flex items-center gap-4 px-6 py-3 flex-shrink-0 text-[11px] uppercase tracking-[0.14em] font-medium"
              style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-ghost)' }}
            >
              <span className="w-20 flex-shrink-0">{seg === 0 ? 'time' : 'date'}</span>
              <span className="flex-1 min-w-0">description</span>
              <span className="w-36 text-right flex-shrink-0">amount</span>
              <span className="w-8 flex-shrink-0" />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
              {loading ? (
                <ListSkeleton />
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 animate-fade-in">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-ghost)' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    nothing here
                  </p>
                </div>
              ) : weeks ? (
                weeks.map((week, wi) => (
                  <div key={week.key} className="animate-fade-in" style={{ animationDelay: `${wi * 0.04}s` }}>
                    <div
                      className="flex items-center justify-between px-3 py-2 mb-1"
                      style={{ marginTop: wi === 0 ? 4 : 18 }}
                    >
                      <span
                        className="text-[11px] uppercase tracking-[0.12em] font-semibold"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {week.label}
                      </span>
                      <span
                        className="text-[12px] font-semibold"
                        style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                      >
                        {fmtShort(week.total)} ₽
                      </span>
                    </div>
                    {week.items.map((t, i) => (
                      <DesktopRow
                        key={t.id} t={t} seg={seg} index={i}
                        onEdit={() => onEdit?.(t)} onDelete={() => onDelete?.(t.id)}
                      />
                    ))}
                  </div>
                ))
              ) : (
                filtered.map((t, i) => (
                  <DesktopRow
                    key={t.id} t={t} seg={seg} index={i}
                    onEdit={() => onEdit?.(t)} onDelete={() => onDelete?.(t.id)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function PeriodBtn({ onClick, disabled, label, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors duration-150 disabled:opacity-25 disabled:cursor-default hover:enabled:bg-[var(--bg-elevated)]"
      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  )
}

/**
 * Desktop list row. There is no swipe on a mouse, so delete lives behind a
 * hover-revealed button that arms itself on the first click — the same two-step
 * guard EditExpense uses, standing in for the deliberateness of the swipe.
 */
function DesktopRow({ t, seg, index, onEdit, onDelete }) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(id)
  }, [armed])

  return (
    <div
      className="group flex items-center gap-4 px-3 py-2.5 rounded-xl cursor-pointer animate-fade-in transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
      style={{ animationDelay: `${Math.min(index, 12) * 0.025}s` }}
      onClick={onEdit}
    >
      <span
        className="text-[12px] w-20 flex-shrink-0"
        style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
      >
        {seg === 0 ? fmtTime(t.ts) : fmtDateShort(t.ts)}
      </span>
      <span className="text-[14px] flex-1 min-w-0 font-light truncate" style={{ color: 'var(--text-primary)' }}>
        {t.description || '—'}
      </span>
      <span
        className="text-[15px] font-medium whitespace-nowrap w-36 text-right flex-shrink-0"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}
      >
        {fmtShort(t.amount)} ₽
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (armed) onDelete?.()
          else setArmed(true)
        }}
        aria-label={armed ? 'Confirm delete' : 'Delete expense'}
        title={armed ? 'Click again to delete' : 'Delete'}
        className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-150 ${
          armed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
        }`}
        style={{
          background: armed ? 'rgba(255,69,58,0.16)' : 'transparent',
          color: armed ? '#ff6b6b' : 'var(--text-ghost)',
        }}
        onMouseEnter={e => { if (!armed) e.currentTarget.style.color = 'var(--text-secondary)' }}
        onMouseLeave={e => { if (!armed) e.currentTarget.style.color = 'var(--text-ghost)' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="animate-fade-in pt-2">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className="flex items-center py-3"
          style={{ borderTop: i > 0 ? '1px solid var(--border-muted)' : 'none' }}
        >
          <div className="skeleton h-3 w-10 flex-shrink-0" />
          <div className="skeleton h-3 flex-1 mx-3" style={{ maxWidth: 140 }} />
          <div className="skeleton h-4 w-14 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

/**
 * Строка списка: тап открывает экран редактирования, где и живёт удаление.
 *
 * Раньше здесь был свайп влево с корзиной под строкой. Он забирал себе
 * горизонтальные жесты почти на всей площади экрана и мешал главному — свайпу
 * по контейнеру, который переключает период. Двух конкурирующих горизонтальных
 * жестов на одном экране быть не должно, и смена даты нужнее.
 */
function Row({ children, onEdit, index }) {
  return (
    <div
      onClick={onEdit}
      className="flex items-center py-3 cursor-pointer animate-fade-in transition-colors duration-150 active:bg-[var(--bg-elevated)]"
      style={{
        borderTop: '1px solid var(--border-muted)',
        animationDelay: `${index * 0.03}s`,
      }}
    >
      {children}
    </div>
  )
}
