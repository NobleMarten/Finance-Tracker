import { useState, useCallback, useEffect, useMemo } from 'react'
import { fmtFull, fmtShort, fmtTime, scaledFontSize } from '../utils/format'
import { toDateInput } from '../utils/date'
import { avatarColor } from '../utils/avatar'
import { useSwipeNav } from '../hooks/useSwipeNav'
import CountUp from './CountUp'
import PullToRefresh from './PullToRefresh'

const SEGMENTS = ['Day', 'Month', 'Year']
const DAY_MS = 86400000
const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/* ────────────────────────── periods ────────────────────────── */

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Whole calendar days between two local midnights; rounding absorbs DST hours. */
function daysBetween(a, b) {
  return Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS)
}

function mondayOf(d) {
  const diff = d.getDay() === 0 ? 6 : d.getDay() - 1
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
}

const fmt = (d, opts) => d.toLocaleDateString('en-GB', opts)

/**
 * `offset` counts periods back from the current one. Ends are built from the
 * calendar (23:59:59.999 of the last day), not `start + 24h`, so a DST switch
 * cannot leak a row into the neighbouring period.
 */
function getRange(seg, offset) {
  const now = new Date()
  const thisYear = now.getFullYear()

  if (seg === 0) {
    const start = new Date(thisYear, now.getMonth(), now.getDate() - offset)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999)
    const opts = { day: 'numeric', month: 'long' }
    if (start.getFullYear() !== thisYear) opts.year = 'numeric'
    return {
      start,
      end,
      title: offset === 0 ? 'Today' : offset === 1 ? 'Yesterday' : fmt(start, { weekday: 'long' }),
      subtitle: fmt(start, opts),
      short: offset === 0 ? 'today' : offset === 1 ? 'yesterday' : fmt(start, { weekday: 'short' }),
    }
  }

  if (seg === 1) {
    const start = new Date(thisYear, now.getMonth() - offset, 1)
    return {
      start,
      end: new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999),
      title: fmt(start, { month: 'long' }),
      subtitle: String(start.getFullYear()),
      short: fmt(start, { month: 'short' }),
    }
  }

  const y = thisYear - offset
  return {
    start: new Date(y, 0, 1),
    end: new Date(y, 11, 31, 23, 59, 59, 999),
    title: String(y),
    subtitle: offset === 0 ? 'this year' : null,
    short: String(y),
  }
}

const inRange = (t, r) => t.ts >= r.start && t.ts <= r.end
const sum = (items) => items.reduce((s, t) => s + t.amount, 0)

/**
 * Splits an already newest-first list into display groups: one flat group for a
 * day, calendar weeks for a month, months for a year. Because the input is
 * sorted, groups come out newest-first too and need no second sort.
 */
function groupItems(seg, items) {
  if (seg === 0) return items.length ? [{ key: 'day', label: null, items, total: sum(items) }] : []

  const groups = []
  let cur = null
  for (const t of items) {
    let key, label
    if (seg === 1) {
      const mon = mondayOf(t.ts)
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6)
      key = toDateInput(mon)
      label = mon.getMonth() === sun.getMonth()
        ? `${mon.getDate()}–${sun.getDate()} ${fmt(mon, { month: 'short' })}`
        : `${fmt(mon, { day: 'numeric', month: 'short' })} – ${fmt(sun, { day: 'numeric', month: 'short' })}`
    } else {
      key = `${t.ts.getFullYear()}-${t.ts.getMonth()}`
      label = fmt(t.ts, { month: 'long' })
    }
    if (!cur || cur.key !== key) {
      cur = { key, label, items: [], total: 0 }
      groups.push(cur)
    }
    cur.items.push(t)
    cur.total += t.amount
  }
  return groups
}

/** Mon–Sun around the selected day, with each day's total for the strip chart. */
function buildWeek(transactions, dayStart) {
  const today = new Date()
  const mon = mondayOf(dayStart)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i)
    return { date, offset: daysBetween(today, date), total: 0 }
  })
  const weekEnd = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 7)
  for (const t of transactions) {
    if (t.ts >= mon && t.ts < weekEnd) days[daysBetween(t.ts, mon)].total += t.amount
  }
  return days
}

function useHistoryData(transactions, seg, offset) {
  return useMemo(() => {
    const range = getRange(seg, offset)
    const filtered = transactions.filter(t => inRange(t, range)).sort((a, b) => b.ts - a.ts)
    const total = sum(filtered)

    const prevRange = getRange(seg, offset + 1)
    const prevTotal = sum(transactions.filter(t => inRange(t, prevRange)))
    // No baseline → no percentage; "+∞%" says nothing useful.
    const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null

    return {
      range,
      filtered,
      total,
      delta,
      deltaLabel: `vs ${prevRange.short}`,
      groups: groupItems(seg, filtered),
      week: seg === 0 ? buildWeek(transactions, range.start) : null,
    }
  }, [transactions, seg, offset])
}

/* ────────────────────────── screen ────────────────────────── */

export default function History({
  transactions, loading, onDelete, onEdit, onRefresh, onAddExpense,
  view, onViewChange, desktop = false,
}) {
  const { seg, offset } = view
  const data = useHistoryData(transactions, seg, offset)

  const setOffset = useCallback((next) => {
    onViewChange(v => ({ ...v, offset: typeof next === 'function' ? next(v.offset) : next }))
  }, [onViewChange])
  const handleSeg = (i) => onViewChange({ seg: i, offset: 0 })

  // Adding is offered only in the day view: there the target day is unambiguous.
  const onAdd = seg === 0 && onAddExpense ? () => onAddExpense(toDateInput(data.range.start)) : null

  // Swipe only on the hero card: on the whole screen, brushing the list while
  // scrolling kept flipping the period.
  const swipe = useSwipeNav({
    onPrev: () => setOffset(o => o + 1),
    onNext: offset > 0 ? () => setOffset(o => Math.max(0, o - 1)) : null,
  })

  // Arrow keys walk through periods — the desktop equivalent of the swipe.
  useEffect(() => {
    if (!desktop) return
    const onKey = (e) => {
      if (e.target.matches?.('input, textarea')) return
      if (e.key === 'ArrowLeft') setOffset(o => o + 1)
      else if (e.key === 'ArrowRight') setOffset(o => Math.max(0, o - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [desktop, setOffset])

  const showSkeleton = loading && transactions.length === 0

  if (desktop) {
    return (
      <DesktopHistory
        seg={seg}
        onSeg={handleSeg}
        offset={offset}
        setOffset={setOffset}
        data={data}
        loading={showSkeleton}
        onAdd={onAdd}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex-shrink-0 flex items-center justify-between gap-4 animate-fade-in">
        <div className="text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          History
        </div>
        <Segments seg={seg} onSeg={handleSeg} />
      </div>

      <PullToRefresh onRefresh={onRefresh} className="flex-1 min-h-0 overflow-y-auto px-4 pb-28">
        <PeriodHero
          seg={seg}
          offset={offset}
          setOffset={setOffset}
          data={data}
          onAdd={onAdd}
          swipe={swipe}
        />

        <div className="mt-5">
          {showSkeleton ? (
            <ListSkeleton />
          ) : data.filtered.length === 0 ? (
            <EmptyState seg={seg} onAdd={onAdd} />
          ) : (
            data.groups.map((g, gi) => (
              <Group key={g.key} group={g} periodTotal={data.total} index={gi}>
                {g.items.map((t, i) => (
                  <Row key={t.id} t={t} seg={seg} index={i} first={i === 0} onEdit={() => onEdit?.(t)} />
                ))}
              </Group>
            ))
          )}
        </div>
      </PullToRefresh>
    </div>
  )
}

/* ────────────────────────── shared pieces ────────────────────────── */

function Segments({ seg, onSeg, desktop = false }) {
  return (
    <div
      className="relative flex p-1"
      style={{
        background: 'var(--bg-surface)',
        borderRadius: desktop ? 'var(--radius-md)' : 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-surface)',
      }}
    >
      {/* Sliding thumb — one element that moves reads calmer than three that blink. */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 transition-transform duration-300 ease-out"
        style={{
          left: 4,
          width: `calc((100% - 8px) / ${SEGMENTS.length})`,
          transform: `translateX(${seg * 100}%)`,
          borderRadius: desktop ? 9 : 7,
          background: 'var(--accent-soft)',
          border: '1px solid rgba(var(--accent-rgb), 0.25)',
        }}
      />
      {SEGMENTS.map((lbl, i) => (
        <button
          key={lbl}
          onClick={() => onSeg(i)}
          className={`relative ${desktop ? 'w-20 py-1.5 text-[12px]' : 'w-14 py-1.5 text-[11px]'} font-semibold tracking-wide transition-colors duration-200 active:scale-95`}
          style={{ color: seg === i ? 'var(--accent)' : 'var(--text-tertiary)' }}
        >
          {lbl}
        </button>
      ))}
    </div>
  )
}

/**
 * The period card: navigation, the total, a comparison with the previous
 * period and — in the day view — the week strip and the add button.
 */
function PeriodHero({ seg, offset, setOffset, data, onAdd, swipe, desktop = false }) {
  const { range, total, filtered, delta, deltaLabel, week } = data
  const count = filtered.length

  return (
    <div
      {...swipe}
      className="hero relative overflow-hidden animate-fade-in"
      style={{
        ...swipe?.style,
        background: 'var(--hero-bg)',
        border: '1px solid var(--hero-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--hero-shadow)',
      }}
    >
      <div
        className="absolute pointer-events-none"
        style={{
          top: -50, right: -50, width: 170, height: 170, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--accent-rgb),0.13) 0%, transparent 70%)',
        }}
      />

      <div className="relative p-5">
        {/* Period navigation */}
        <div className="flex items-center gap-2">
          <PeriodBtn onClick={() => setOffset(o => o + 1)} label="Previous period">
            <polyline points="15 18 9 12 15 6" />
          </PeriodBtn>
          <div key={`${seg}-${offset}`} className="flex-1 min-w-0 text-center animate-fade-in">
            <div className="text-[15px] font-semibold tracking-tight truncate capitalize" style={{ color: 'var(--text-primary)' }}>
              {range.title}
            </div>
            {range.subtitle && (
              <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {range.subtitle}
              </div>
            )}
          </div>
          <PeriodBtn onClick={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0} label="Next period">
            <polyline points="9 18 15 12 9 6" />
          </PeriodBtn>
        </div>

        {/* Total */}
        <div className="mt-5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.16em] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
              spent
            </div>
            <div
              className="whitespace-nowrap font-medium"
              style={{
                fontSize: scaledFontSize(total, desktop ? 34 : 36, 22, 7) + 'px',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <CountUp value={total} format={desktop ? fmtShort : fmtFull} />
              <span className="text-[0.55em] ml-1" style={{ color: 'var(--text-tertiary)' }}>₽</span>
            </div>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-2">
              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                {count} {count === 1 ? 'expense' : 'expenses'}
              </span>
              {delta !== null && total > 0 && <DeltaPill delta={delta} label={deltaLabel} />}
            </div>
          </div>

          {onAdd && !desktop && (
            <button
              onClick={onAdd}
              aria-label={`Add expense on ${range.subtitle}`}
              className="flex-shrink-0 h-10 pl-3 pr-4 flex items-center gap-1.5 text-[13px] font-semibold transition-transform duration-150 active:scale-95"
              style={{
                borderRadius: 'var(--radius-full)',
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                boxShadow: '0 6px 20px var(--accent-glow)',
              }}
            >
              <PlusGlyph />
              Add
            </button>
          )}
        </div>

        {week && <WeekStrip week={week} offset={offset} setOffset={setOffset} />}

        {onAdd && desktop && (
          <button
            onClick={onAdd}
            className="mt-5 w-full h-10 flex items-center justify-center gap-2 text-[13px] font-semibold transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            style={{
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              boxShadow: '0 4px 16px var(--accent-glow)',
            }}
          >
            <PlusGlyph />
            Add to {range.short}
          </button>
        )}
      </div>
    </div>
  )
}

function DeltaPill({ delta, label }) {
  // Spending more is the "bad" direction, so up is red and down is green.
  const up = delta > 0
  const flat = delta === 0
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5"
      style={{
        borderRadius: 6,
        fontFamily: 'var(--font-mono)',
        background: flat ? 'var(--overlay)' : up ? 'var(--danger-soft)' : 'var(--success-soft)',
        color: flat ? 'var(--text-secondary)' : up ? 'var(--danger)' : 'var(--success)',
      }}
    >
      {flat ? '=' : up ? '↑' : '↓'} {Math.abs(delta)}%
      <span className="font-medium" style={{ fontFamily: 'var(--font-ui)', opacity: 0.8 }}>{label}</span>
    </span>
  )
}

/** Seven bars for the selected day's week; tap one to jump to that day. */
function WeekStrip({ week, offset, setOffset }) {
  const max = Math.max(1, ...week.map(d => d.total))

  return (
    <div className="mt-5 pt-4 grid grid-cols-7 gap-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      {week.map((d, i) => {
        const selected = d.offset === offset
        const future = d.offset < 0
        const isToday = d.offset === 0
        const h = d.total > 0 ? Math.max(4, Math.round((d.total / max) * 36)) : 2
        return (
          <button
            key={i}
            disabled={future}
            onClick={() => setOffset(d.offset)}
            aria-label={`${d.date.toDateString()}: ${fmtShort(d.total)} ₽`}
            aria-current={selected ? 'date' : undefined}
            className="flex flex-col items-center gap-1.5 py-1.5 transition-colors duration-150 disabled:cursor-default"
            style={{
              borderRadius: 10,
              background: selected ? 'var(--accent-soft)' : 'transparent',
              opacity: future ? 0.35 : 1,
            }}
          >
            <div className="h-9 w-full flex items-end justify-center">
              <div
                className="w-2.5 transition-all duration-300"
                style={{
                  height: h,
                  borderRadius: 3,
                  background: selected
                    ? 'var(--accent)'
                    : d.total > 0 ? 'rgba(var(--accent-rgb), 0.35)' : 'var(--border-subtle)',
                }}
              />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: selected ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              {WEEK_LETTERS[i]}
            </span>
            <span
              className="text-[11px] leading-none"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: selected || isToday ? 600 : 400,
                color: selected ? 'var(--accent)' : isToday ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {d.date.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * A titled card of rows. Month/Year groups get a header with the group total
 * and a thin bar showing its share of the whole period.
 */
function Group({ group, periodTotal, index, children, desktop = false }) {
  const share = periodTotal > 0 ? group.total / periodTotal : 0

  return (
    <section className="mb-5 animate-fade-in" style={{ animationDelay: `${Math.min(index, 6) * 0.05}s` }}>
      {group.label && (
        <div className="px-1 mb-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-semibold capitalize" style={{ color: 'var(--text-secondary)' }}>
              {group.label}
              <span className="ml-2 font-medium" style={{ color: 'var(--text-ghost)' }}>{group.items.length}</span>
            </span>
            <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {fmtShort(group.total)} ₽
            </span>
          </div>
          <div className="mt-1.5 h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--border-muted)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, share * 100)}%`, background: 'rgba(var(--accent-rgb), 0.6)' }}
            />
          </div>
        </div>
      )}
      <div
        className={desktop ? '' : 'overflow-hidden'}
        style={desktop ? undefined : {
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-surface)',
        }}
      >
        {children}
      </div>
    </section>
  )
}

function Avatar({ text, size = 36 }) {
  const c = avatarColor(text)
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 font-semibold"
      style={{ width: size, height: size, borderRadius: 11, background: c.bg, color: c.fg, fontSize: size * 0.38 }}
    >
      {(text || '—')[0].toUpperCase()}
    </div>
  )
}

function rowMeta(t, seg) {
  if (seg === 0) return fmtTime(t.ts)
  if (seg === 1) return `${fmt(t.ts, { weekday: 'short', day: 'numeric' })} · ${fmtTime(t.ts)}`
  return `${fmt(t.ts, { day: 'numeric', month: 'short' })} · ${fmtTime(t.ts)}`
}

/**
 * Строка списка: тап открывает экран редактирования, где и живёт удаление.
 *
 * Раньше здесь был свайп влево с корзиной под строкой. Он забирал себе
 * горизонтальные жесты почти на всей площади экрана и мешал главному — свайпу
 * по контейнеру, который переключает период. Двух конкурирующих горизонтальных
 * жестов на одном экране быть не должно, и смена даты нужнее.
 */
function Row({ t, seg, index, first, onEdit }) {
  return (
    <div
      onClick={onEdit}
      className="relative flex items-center gap-3 px-3.5 py-3 cursor-pointer animate-fade-in transition-colors duration-150 active:bg-[var(--bg-hover)]"
      style={{ animationDelay: `${Math.min(index, 12) * 0.03}s` }}
    >
      {/* Divider inset past the avatar, iOS-list style */}
      {!first && (
        <span className="absolute top-0 right-0" style={{ left: 62, borderTop: '1px solid var(--border-subtle)' }} />
      )}
      <Avatar text={t.description} />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {t.description || '—'}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {rowMeta(t, seg)}
        </div>
      </div>
      <span className="text-[15px] font-medium whitespace-nowrap" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>
        {fmtShort(t.amount)}
        <span className="text-[12px] ml-0.5" style={{ color: 'var(--text-tertiary)' }}>₽</span>
      </span>
    </div>
  )
}

function EmptyState({ seg, onAdd, desktop = false }) {
  const text = seg === 0 ? 'No expenses this day' : seg === 1 ? 'No expenses this month' : 'No expenses this year'
  return (
    <div className={`flex flex-col items-center justify-center ${desktop ? 'h-full py-20' : 'py-10'} animate-fade-in`}>
      <div
        className="w-14 h-14 flex items-center justify-center mb-4"
        style={{ borderRadius: 18, background: 'var(--bg-surface)', border: '1px dashed var(--border-subtle)' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>{text}</p>
      {onAdd ? (
        <button
          onClick={onAdd}
          className="mt-4 h-9 px-4 flex items-center gap-1.5 text-[13px] font-semibold transition-all duration-150 active:scale-95"
          style={{
            borderRadius: 'var(--radius-full)',
            color: 'var(--accent)',
            background: 'var(--accent-soft)',
            border: '1px solid rgba(var(--accent-rgb), 0.3)',
          }}
        >
          <PlusGlyph />
          Add one
        </button>
      ) : (
        <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {desktop ? 'Use ← → to browse other periods' : 'Swipe to browse other periods'}
        </p>
      )}
    </div>
  )
}

function PlusGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function PeriodBtn({ onClick, disabled, label, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-default hover:enabled:bg-[var(--bg-hover)]"
      style={{ color: 'var(--text-secondary)', background: 'var(--overlay)', border: '1px solid var(--border-subtle)' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  )
}

function ListSkeleton() {
  return (
    <div
      className="animate-fade-in overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-surface)' }}
    >
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3 px-3.5 py-3">
          <div className="skeleton w-9 h-9 flex-shrink-0" style={{ borderRadius: 11 }} />
          <div className="flex-1">
            <div className="skeleton h-3 mb-2" style={{ maxWidth: 140 }} />
            <div className="skeleton h-2.5 w-12" />
          </div>
          <div className="skeleton h-4 w-14 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

/* ────────────────────────── desktop ────────────────────────── */

/**
 * Wide layout. The period card moves into a fixed side rail so it stays put
 * while the list scrolls, and the list itself gets a real table shape — time,
 * description, amount in aligned columns — instead of the phone's stacked row.
 */
function DesktopHistory({ seg, onSeg, offset, setOffset, data, loading, onAdd, onDelete, onEdit }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="mx-auto w-full max-w-[1480px] px-10 pt-8 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0 animate-fade-in">
          <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            History
          </h1>
          <Segments seg={seg} onSeg={onSeg} desktop />
        </div>

        <div className="flex gap-6 flex-1 min-h-0 pb-8">
          {/* Side rail */}
          <aside className="w-[320px] flex-shrink-0 flex flex-col gap-4 animate-fade-in delay-1">
            <PeriodHero seg={seg} offset={offset} setOffset={setOffset} data={data} onAdd={onAdd} desktop />
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
              boxShadow: 'var(--shadow-surface)',
            }}
          >
            <div
              className="flex items-center gap-4 px-6 py-3 flex-shrink-0 text-[11px] uppercase tracking-[0.14em] font-medium"
              style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)' }}
            >
              <span className="w-9 flex-shrink-0" />
              <span className="flex-1 min-w-0">description</span>
              <span className="w-32 flex-shrink-0">{seg === 0 ? 'time' : 'date'}</span>
              <span className="w-36 text-right flex-shrink-0">amount</span>
              <span className="w-8 flex-shrink-0" />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
              {loading ? (
                <ListSkeleton />
              ) : data.filtered.length === 0 ? (
                <EmptyState seg={seg} onAdd={onAdd} desktop />
              ) : (
                data.groups.map((g, gi) => (
                  <div key={g.key} className="px-3">
                    <Group group={g} periodTotal={data.total} index={gi} desktop>
                      {g.items.map((t, i) => (
                        <DesktopRow
                          key={t.id} t={t} seg={seg} index={i}
                          onEdit={() => onEdit?.(t)} onDelete={() => onDelete?.(t.id)}
                        />
                      ))}
                    </Group>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/**
 * Desktop list row. There is no swipe on a mouse, so delete lives behind a
 * hover-revealed button that arms itself on the first click — the same two-step
 * guard EditExpense uses.
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
      className="group flex items-center gap-4 -mx-3 px-3 py-2.5 rounded-xl cursor-pointer animate-fade-in transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
      style={{ animationDelay: `${Math.min(index, 12) * 0.025}s` }}
      onClick={onEdit}
    >
      <Avatar text={t.description} />
      <span className="text-[14px] flex-1 min-w-0 font-medium truncate" style={{ color: 'var(--text-primary)' }}>
        {t.description || '—'}
      </span>
      <span className="text-[12px] w-32 flex-shrink-0" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {rowMeta(t, seg)}
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
          background: armed ? 'var(--danger-soft)' : 'transparent',
          color: armed ? 'var(--danger)' : 'var(--text-ghost)',
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
