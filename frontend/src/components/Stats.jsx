import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/api'
import { fmtShort, scaledFontSize } from '../utils/format'
import { usePrefersReducedMotion } from '../hooks/useReducedMotion'
import CountUp from './CountUp'
import PullToRefresh from './PullToRefresh'
import DayDetail from './DayDetail'

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

export default function Stats({ onAddExpense, transactions = [], onEdit }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [detailDay, setDetailDay] = useState(null) // drill-down: selected day number

  const loadStats = useCallback(() => {
    setLoading(true)
    setError(null)
    return api.getStats(month, year)
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [month, year])

  useEffect(() => { loadStats() }, [loadStats])

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  function prevMonth() {
    setDetailDay(null)
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    setDetailDay(null)
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const maxDay = isCurrentMonth ? now.getDate() : getDaysInMonth(month, year)

  const dailyMap = {}
  if (stats?.daily) {
    for (const d of stats.daily) {
      const day = parseInt(d.date.split('-')[2], 10)
      dailyMap[day] = d.amount
    }
  }

  const dailyData = Array.from({ length: maxDay }, (_, i) => ({
    day: i + 1,
    amount: dailyMap[i + 1] ?? 0,
  }))

  const maxDayAmount = Math.max(...dailyData.map(d => d.amount), 0)
  const maxAmount = Math.max(maxDayAmount, 1)

  const delta =
    stats && stats.prevmonth > 0
      ? Math.round(((stats.currentmonth - stats.prevmonth) / stats.prevmonth) * 100)
      : null

  const isEmpty = stats && !loading && stats.currentmonth === 0

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
    <PullToRefresh onRefresh={loadStats} className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-24">

      {/* Hero summary card */}
      <div
        className="mx-4 mt-5 animate-fade-in relative"
        style={{
          background: 'linear-gradient(160deg, rgba(108,140,255,0.08) 0%, var(--bg-surface) 55%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Glow lives in its own clip layer so the card never clips the content */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: 'inherit' }}>
          <div className="absolute"
            style={{ top: -40, right: -40, width: 140, height: 140, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(108,140,255,0.10) 0%, transparent 70%)' }} />
        </div>

        {/* Month selector inside card */}
        <div className="relative flex items-center justify-between px-5 pt-5">
          <button onClick={prevMonth} aria-label="Previous month"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}>
            <ChevronLeft />
          </button>
          <div className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {MONTHS_FULL[month - 1]} {year}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth} aria-label="Next month"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-20 disabled:active:scale-100"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}>
            <ChevronRight />
          </button>
        </div>

        <div className="relative px-5 pt-4 pb-5">
          <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Total spent
          </div>
          <div
            className="font-medium whitespace-nowrap"
            style={{
              fontSize: scaledFontSize(stats?.currentmonth ?? 0, 38, 22, 7) + 'px',
              lineHeight: 1.15,
              letterSpacing: '-0.02em', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
            }}
          >
            {loading
              ? <span className="skeleton inline-block align-middle h-8 w-40" />
              : <><CountUp value={stats?.currentmonth ?? 0} format={fmtShort} /> ₽</>}
          </div>
          {delta !== null && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: delta > 0 ? 'rgba(255,107,107,0.14)' : 'rgba(74,222,128,0.14)',
                  color: delta > 0 ? '#ff8585' : '#5ee89a',
                }}
              >
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
              </span>
              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                vs last month
              </span>
            </div>
          )}
        </div>
      </div>

      {loading && <StatsSkeleton />}

      {error && (
        <div className="mx-5 mt-3 px-4 py-3 rounded-xl text-[13px]"
          style={{ background: 'rgba(255,80,80,0.10)', color: '#ff8585' }}>
          {error}
        </div>
      )}

      {isEmpty && (
        <EmptyState
          isCurrentMonth={isCurrentMonth}
          monthName={MONTHS_FULL[month - 1]}
          onAddExpense={onAddExpense}
        />
      )}

      {stats && !loading && !isEmpty && (
        <>
          {/* Bar chart */}
          <div className="mx-4 mt-4 mb-5">
            <BarChart
              data={dailyData}
              maxAmount={maxAmount}
              monthLabel={MONTHS_FULL[month - 1].slice(0, 3)}
              onOpenDay={setDetailDay}
            />
          </div>

          <div className="mx-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

          {/* Stat cards 2×2 grid */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3 mb-5">
            <StatCard label="Avg / day" value={stats.avgday} />
            <StatCard label="Max / day" value={maxDayAmount} />
            <StatCard label="Prev month" value={stats.prevmonth} />
            <StatCard
              label="vs prev"
              value={null}
              extra={delta !== null ? (
                <span
                  className="text-[18px] font-medium"
                  style={{ fontFamily: 'var(--font-mono)', color: delta > 0 ? '#ff8585' : '#5ee89a' }}
                >
                  {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
                </span>
              ) : (
                <span className="text-[18px] font-medium" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>—</span>
              )}
            />
          </div>

          <div className="mx-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

          {/* Top expenses with progress bars */}
          <div className="px-5 pt-4">
            <div className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Top expenses
            </div>
            {(!stats.topexp || stats.topexp.length === 0) && (
              <p className="text-[13px] pt-1" style={{ color: 'var(--text-tertiary)' }}>
                No expenses this month
              </p>
            )}
            {stats.topexp?.map((exp, i) => {
              const pct = stats.currentmonth > 0
                ? Math.round((exp.amount / stats.currentmonth) * 100)
                : 0
              return (
                <div
                  key={exp.id}
                  className="py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--border-muted)' : 'none' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="text-[11px] font-semibold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                        {exp.title || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pl-3 flex-shrink-0">
                      <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {pct}%
                      </span>
                      <span
                        className="text-[15px] font-medium whitespace-nowrap"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}
                      >
                        <CountUp value={exp.amount} format={fmtShort} /> ₽
                      </span>
                    </div>
                  </div>
                  <ProgressBar pct={pct} index={i} />
                </div>
              )
            })}
          </div>
        </>
      )}
    </PullToRefresh>

    {detailDay != null && (
      <DayDetail
        day={detailDay}
        month={month}
        year={year}
        monthName={MONTHS_FULL[month - 1]}
        transactions={transactions}
        onEdit={onEdit}
        onClose={() => setDetailDay(null)}
      />
    )}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Chart placeholder */}
      <div className="mx-4 mt-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-3 w-16" />
        </div>
        <div className="skeleton w-full" style={{ height: 90, borderRadius: 'var(--radius-md)' }} />
      </div>

      <div className="mx-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* 2×2 stat cards */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3 mb-5">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="p-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
          >
            <div className="skeleton h-3 w-16 mb-3" />
            <div className="skeleton h-5 w-20" />
          </div>
        ))}
      </div>

      <div className="mx-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Top expenses */}
      <div className="px-5 pt-4">
        <div className="skeleton h-3 w-24 mb-4" />
        {[0, 1, 2].map(i => (
          <div key={i} className="py-3" style={{ borderTop: i > 0 ? '1px solid var(--border-muted)' : 'none' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-3 w-14" />
            </div>
            <div className="skeleton h-[3px] w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ isCurrentMonth, monthName, onAddExpense }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16 animate-fade-in">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'var(--accent-soft)' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="21" x2="21" y2="21" />
          <rect x="5" y="11" width="3.4" height="7" rx="1" />
          <rect x="10.3" y="7" width="3.4" height="11" rx="1" />
          <rect x="15.6" y="13" width="3.4" height="5" rx="1" />
        </svg>
      </div>

      <h3 className="text-[16px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        {isCurrentMonth ? 'No expenses yet' : `Nothing in ${monthName}`}
      </h3>
      <p className="text-[13px] leading-relaxed max-w-[240px]" style={{ color: 'var(--text-secondary)' }}>
        {isCurrentMonth
          ? 'Add your first expense and your spending breakdown will show up here.'
          : 'No expenses were recorded this month.'}
      </p>

      {isCurrentMonth && onAddExpense && (
        <button
          onClick={onAddExpense}
          className="mt-6 px-5 h-10 rounded-full text-[13px] font-medium active:scale-95 transition-transform"
          style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 0 20px var(--accent-glow)' }}
        >
          Add expense
        </button>
      )}
    </div>
  )
}

function BarChart({ data, maxAmount, monthLabel, onOpenDay }) {
  const reduced = usePrefersReducedMotion()
  const [animated, setAnimated] = useState(false)
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null) // tap-to-pin for touch devices
  const BAR_H = 72
  const barWidth = Math.max(4, Math.min(12, Math.floor(280 / Math.max(data.length, 1)) - 2))
  const gap = Math.max(1, Math.min(3, Math.floor(280 / Math.max(data.length, 1)) - barWidth))
  const totalW = data.length * (barWidth + gap) - gap
  const svgW = Math.max(totalW, 280)
  const gradId = 'bar-grad'

  useEffect(() => {
    setSelected(null)
    if (reduced) { setAnimated(true); return }
    setAnimated(false)
    const id = setTimeout(() => setAnimated(true), 30)
    return () => clearTimeout(id)
  }, [data, reduced])

  const activeIndex = hovered !== null ? hovered : selected
  const active = activeIndex != null ? data[activeIndex] : null

  return (
    <div>
      {/* Active day's value lives here, above the bars — never overlapping them */}
      <div className="flex items-baseline justify-between gap-3 mb-3" style={{ minHeight: 18 }}>
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          Daily spending
        </span>
        {active && active.amount > 0 ? (
          <button
            onClick={() => onOpenDay?.(active.day)}
            className="text-[12px] whitespace-nowrap flex items-center gap-1 rounded-md px-1.5 py-0.5 -mr-1.5 transition-colors active:scale-95"
            style={{ background: 'var(--accent-soft)' }}
            aria-label={`View expenses for ${active.day} ${monthLabel}`}
          >
            <span style={{ color: 'var(--accent)' }}>{active.day} {monthLabel} · </span>
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              {fmtShort(active.amount)} ₽
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--text-ghost)' }}>tap a bar</span>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${svgW} ${BAR_H + 18}`}
        width="100%"
        style={{ display: 'block', minWidth: Math.min(totalW, 280), overflow: 'visible' }}
        role="img"
        aria-label={`Daily spending chart, highest day ${fmtShort(maxAmount)} ₽`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line
          x1={0} y1={BAR_H} x2={svgW} y2={BAR_H}
          stroke="var(--border-subtle)" strokeWidth="0.5"
        />

        {data.map((d, i) => {
          const fullBarH = d.amount > 0 ? Math.max(3, (d.amount / maxAmount) * BAR_H) : 2
          const x = i * (barWidth + gap)
          // Hover wins on desktop; otherwise fall back to the tapped (pinned) bar.
          const isActive = hovered === i || (hovered === null && selected === i)
          const hasData = d.amount > 0
          const delay = i * 0.012

          return (
            <g
              key={d.day}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => hasData && setSelected(p => (p === i ? null : i))}
              style={{ cursor: hasData ? 'pointer' : 'default' }}
            >
              {/* Full-height transparent hit target — makes tiny bars tappable on touch */}
              <rect x={x} y={0} width={barWidth + gap} height={BAR_H} fill="transparent" />

              {/* Bar — grows from bottom via scaleY */}
              <g transform={`translate(${x}, ${BAR_H})`}>
                <rect
                  x={0}
                  y={-fullBarH}
                  width={barWidth}
                  height={fullBarH}
                  rx={Math.min(2, barWidth / 2)}
                  fill={!hasData ? 'var(--bg-elevated)' : isActive ? 'var(--accent)' : `url(#${gradId})`}
                  style={{
                    transformOrigin: '0px 0px',
                    transform: animated ? 'scaleY(1)' : 'scaleY(0)',
                    transition: reduced
                      ? 'fill 0.12s'
                      : `transform 0.45s cubic-bezier(0.34,1.2,0.64,1) ${delay}s, fill 0.12s`,
                  }}
                />
              </g>

              {/* Day label — every 5th day, plus the active one for clarity */}
              {(d.day === 1 || d.day % 5 === 0 || isActive) && (
                <text
                  x={x + barWidth / 2}
                  y={BAR_H + 14}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight={isActive ? 600 : 400}
                  fill={isActive ? 'var(--accent)' : 'rgba(255,255,255,0.5)'}
                >
                  {d.day}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      </div>
    </div>
  )
}

function StatCard({ label, value, extra }) {
  return (
    <div
      className="p-4"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      {value !== null ? (
        <div
          className="font-medium whitespace-nowrap"
          style={{
            fontSize: scaledFontSize(value, 18, 13, 6) + 'px',
            lineHeight: 1.2,
            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em',
          }}
        >
          <CountUp value={value} format={fmtShort} /> ₽
        </div>
      ) : null}
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  )
}

function ProgressBar({ pct, index }) {
  const reduced = usePrefersReducedMotion()
  const [width, setWidth] = useState(reduced ? pct : 0)

  useEffect(() => {
    if (reduced) { setWidth(pct); return }
    const id = setTimeout(() => setWidth(pct), 60 + index * 80)
    return () => clearTimeout(id)
  }, [pct, index, reduced])

  return (
    <div
      className="h-[3px] w-full rounded-full overflow-hidden"
      style={{ background: 'var(--bg-elevated)' }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: 'linear-gradient(90deg, rgba(108,140,255,0.5) 0%, var(--accent) 100%)',
          transition: reduced ? 'none' : 'width 0.6s cubic-bezier(0.34,1.1,0.64,1)',
        }}
      />
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
