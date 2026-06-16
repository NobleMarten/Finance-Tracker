import { useState, useEffect, useRef } from 'react'
import { api } from '../api/api'
import { fmtShort } from '../utils/format'

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

export default function Stats() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.getStats(month, year)
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [month, year])

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (isCurrentMonth) return
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

  const maxAmount = Math.max(...dailyData.map(d => d.amount), 1)

  const delta =
    stats && stats.prevmonth > 0
      ? Math.round(((stats.currentmonth - stats.prevmonth) / stats.prevmonth) * 100)
      : null

  const maxDay2 = Math.max(...dailyData.map(d => d.amount), 0)

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-24">

      {/* A — Hero summary card */}
      <div
        className="mx-4 mt-5 animate-fade-in relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(108,140,255,0.11) 0%, rgba(26,26,30,0.95) 60%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 32px rgba(0,0,0,0.35)',
        }}
      >
        <div className="absolute pointer-events-none"
          style={{ top: -40, right: -40, width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(108,140,255,0.10) 0%, transparent 70%)' }} />

        {/* Month selector inside card */}
        <div className="flex items-center justify-between px-5 pt-5">
          <button onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}>
            <ChevronLeft />
          </button>
          <div className="text-[11px] uppercase tracking-[0.18em] font-medium"
            style={{ color: 'var(--text-tertiary)' }}>
            {MONTHS_FULL[month - 1]} {year}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors disabled:opacity-20"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}>
            <ChevronRight />
          </button>
        </div>

        <div className="px-5 pt-4 pb-5">
          <div className="text-[11px] uppercase tracking-[0.16em] font-medium mb-2"
            style={{ color: 'var(--text-tertiary)' }}>
            total spent
          </div>
          <div
            className="text-[38px] leading-none font-medium"
            style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
          >
            {loading ? '—' : fmtShort(stats?.currentmonth ?? 0)} ₽
          </div>
          {delta !== null && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: delta > 0 ? 'rgba(255,107,107,0.12)' : 'rgba(74,222,128,0.12)',
                  color: delta > 0 ? '#ff6b6b' : '#4ade80',
                }}
              >
                {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                vs last month
              </span>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</div>
        </div>
      )}

      {error && (
        <div className="mx-5 mt-3 px-4 py-3 rounded-xl text-[13px]"
          style={{ background: 'rgba(255,80,80,0.08)', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {stats && !loading && (
        <>
          {/* Bar chart */}
          <div className="mx-4 mt-4 mb-5">
            <div className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3"
              style={{ color: 'var(--text-tertiary)' }}>
              daily spending
            </div>
            <BarChart data={dailyData} maxAmount={maxAmount} />
          </div>

          <div className="mx-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

          {/* D — Stat cards 2×2 grid */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3 mb-5">
            <StatCard label="avg / day" value={stats.avgday} />
            <StatCard label="max / day" value={maxDay2} />
            <StatCard label="prev month" value={stats.prevmonth} />
            <StatCard
              label="vs prev"
              value={null}
              extra={delta !== null ? (
                <span
                  className="text-[18px] font-medium"
                  style={{ fontFamily: 'var(--font-mono)', color: delta > 0 ? '#ff6b6b' : '#4ade80' }}
                >
                  {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
                </span>
              ) : (
                <span className="text-[18px] font-medium" style={{ color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}>—</span>
              )}
            />
          </div>

          <div className="mx-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

          {/* B — Top expenses with progress bars */}
          <div className="px-5 pt-4">
            <div className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3"
              style={{ color: 'var(--text-tertiary)' }}>
              top expenses
            </div>
            {(!stats.topexp || stats.topexp.length === 0) && (
              <p className="text-[13px] pt-1" style={{ color: 'var(--text-ghost)' }}>
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
                      <span className="text-[13px] font-light truncate"
                        style={{ color: 'var(--text-secondary)' }}>
                        {exp.title || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pl-3 flex-shrink-0">
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        {pct}%
                      </span>
                      <span
                        className="text-[15px] font-medium whitespace-nowrap"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}
                      >
                        {fmtShort(exp.amount)} ₽
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
    </div>
  )
}

function BarChart({ data, maxAmount }) {
  const [animated, setAnimated] = useState(false)
  const [hovered, setHovered] = useState(null)
  const BAR_H = 72
  const barWidth = Math.max(4, Math.min(12, Math.floor(280 / Math.max(data.length, 1)) - 2))
  const gap = Math.max(1, Math.min(3, Math.floor(280 / Math.max(data.length, 1)) - barWidth))
  const totalW = data.length * (barWidth + gap) - gap
  const svgW = Math.max(totalW, 280)
  const gradId = 'bar-grad'

  useEffect(() => {
    setAnimated(false)
    const id = setTimeout(() => setAnimated(true), 30)
    return () => clearTimeout(id)
  }, [data])

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${svgW} ${BAR_H + 18}`}
        width="100%"
        style={{ display: 'block', minWidth: Math.min(totalW, 280), overflow: 'visible' }}
        aria-hidden="true"
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
          const isHov = hovered === i
          const hasData = d.amount > 0
          const delay = i * 0.012
          const tooltipX = Math.max(0, Math.min(x - 8, svgW - 56))

          return (
            <g
              key={d.day}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: hasData ? 'pointer' : 'default' }}
            >
              {/* Bar — grows from bottom via scaleY */}
              <g transform={`translate(${x}, ${BAR_H})`}>
                <rect
                  x={0}
                  y={-fullBarH}
                  width={barWidth}
                  height={fullBarH}
                  rx={Math.min(2, barWidth / 2)}
                  fill={!hasData ? 'var(--bg-elevated)' : isHov ? 'var(--accent)' : `url(#${gradId})`}
                  style={{
                    transformOrigin: '0px 0px',
                    transform: animated ? 'scaleY(1)' : 'scaleY(0)',
                    transition: `transform 0.45s cubic-bezier(0.34,1.2,0.64,1) ${delay}s, fill 0.12s`,
                  }}
                />
              </g>

              {/* Day label */}
              {(d.day === 1 || d.day % 5 === 0) && (
                <text
                  x={x + barWidth / 2}
                  y={BAR_H + 14}
                  textAnchor="middle"
                  fontSize="8"
                  fill={isHov ? 'var(--accent)' : 'var(--text-tertiary)'}
                >
                  {d.day}
                </text>
              )}

              {/* Tooltip */}
              {isHov && hasData && (
                <g>
                  <rect
                    x={tooltipX}
                    y={Math.max(1, BAR_H - fullBarH - 20)}
                    width={54}
                    height={15}
                    rx={4}
                    fill="var(--bg-elevated)"
                    stroke="var(--border-subtle)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={tooltipX + 27}
                    y={Math.max(1, BAR_H - fullBarH - 20) + 10}
                    textAnchor="middle"
                    fontSize="8"
                    fill="var(--text-primary)"
                  >
                    {fmtShort(d.amount)} ₽
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
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
      <div className="text-[11px] uppercase tracking-[0.14em] font-medium mb-2"
        style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
      {value !== null ? (
        <div
          className="text-[18px] font-medium whitespace-nowrap overflow-hidden"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}
        >
          {fmtShort(value)} ₽
        </div>
      ) : null}
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  )
}

function ProgressBar({ pct, index }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => setWidth(pct), 60 + index * 80)
    return () => clearTimeout(id)
  }, [pct, index])

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
          transition: 'width 0.6s cubic-bezier(0.34,1.1,0.64,1)',
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
