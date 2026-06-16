import { useState, useEffect } from 'react'
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

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-24">
      {/* Month selector */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <ChevronLeft />
        </button>
        <div className="text-center">
          <div className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
            {MONTHS_FULL[month - 1]}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{year}</div>
        </div>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-20"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <ChevronRight />
        </button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Loading…</div>
        </div>
      )}

      {error && (
        <div className="mx-5 mt-2 px-4 py-3 rounded-xl text-[13px]"
          style={{ background: 'rgba(255,80,80,0.08)', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {stats && !loading && (
        <>
          {/* Bar chart */}
          <div className="mx-4 mt-2 mb-5">
            <div className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3"
              style={{ color: 'var(--text-tertiary)' }}>
              daily spending
            </div>
            <BarChart data={dailyData} maxAmount={maxAmount} />
          </div>

          <div className="mx-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

          {/* Stat cards */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3 mb-5">
            <StatCard label="avg / day" value={stats.avgday} />
            <StatCard label="this month" value={stats.currentmonth} />
            <StatCard
              label="prev month"
              value={stats.prevmonth}
              extra={delta !== null ? (
                <span className="text-[11px] font-medium"
                  style={{ color: delta > 0 ? '#ff6b6b' : '#4ade80' }}>
                  {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
                </span>
              ) : null}
            />
          </div>

          <div className="mx-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

          {/* Top expenses */}
          <div className="px-5 pt-4">
            <div className="text-[11px] uppercase tracking-[0.14em] font-medium mb-1"
              style={{ color: 'var(--text-tertiary)' }}>
              top expenses
            </div>
            {(!stats.topexp || stats.topexp.length === 0) && (
              <p className="text-[13px] pt-3" style={{ color: 'var(--text-ghost)' }}>
                No expenses this month
              </p>
            )}
            {stats.topexp?.map((exp, i) => (
              <div
                key={exp.id}
                className="flex items-center justify-between py-3"
                style={{ borderTop: i > 0 ? '1px solid var(--border-muted)' : 'none' }}
              >
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
                <span
                  className="text-[15px] font-medium pl-3 whitespace-nowrap"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}
                >
                  {fmtShort(exp.amount)} ₽
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function BarChart({ data, maxAmount }) {
  const [hovered, setHovered] = useState(null)
  const BAR_H = 72
  const barWidth = Math.max(4, Math.min(12, Math.floor(280 / Math.max(data.length, 1)) - 2))
  const gap = Math.max(1, Math.min(3, Math.floor(280 / Math.max(data.length, 1)) - barWidth))
  const totalW = data.length * (barWidth + gap) - gap

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${Math.max(totalW, 280)} ${BAR_H + 18}`}
        width="100%"
        style={{ display: 'block', minWidth: Math.min(totalW, 280) }}
        aria-hidden="true"
      >
        {data.map((d, i) => {
          const barH = d.amount > 0 ? Math.max(3, (d.amount / maxAmount) * BAR_H) : 2
          const x = i * (barWidth + gap)
          const y = BAR_H - barH
          const isHov = hovered === i
          const hasData = d.amount > 0

          const tooltipX = Math.max(0, Math.min(x - 8, Math.max(totalW, 280) - 56))

          return (
            <g
              key={d.day}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: hasData ? 'pointer' : 'default' }}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={Math.min(2, barWidth / 2)}
                fill={
                  !hasData
                    ? 'var(--bg-elevated)'
                    : isHov
                      ? 'var(--accent)'
                      : 'rgba(108,140,255,0.5)'
                }
                style={{ transition: 'fill 0.12s' }}
              />
              {(d.day === 1 || d.day % 5 === 0) && !isHov && (
                <text
                  x={x + barWidth / 2}
                  y={BAR_H + 14}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--text-tertiary)"
                >
                  {d.day}
                </text>
              )}
              {isHov && (
                <text
                  x={x + barWidth / 2}
                  y={BAR_H + 14}
                  textAnchor="middle"
                  fontSize="8"
                  fill="var(--accent)"
                >
                  {d.day}
                </text>
              )}
              {isHov && hasData && (
                <g>
                  <rect
                    x={tooltipX}
                    y={Math.max(1, y - 18)}
                    width={54}
                    height={15}
                    rx={4}
                    fill="var(--bg-elevated)"
                    stroke="var(--border-subtle)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={tooltipX + 27}
                    y={Math.max(1, y - 18) + 10}
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
      <div
        className="text-[18px] font-medium whitespace-nowrap overflow-hidden"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}
      >
        {fmtShort(value)} ₽
      </div>
      {extra && <div className="mt-1">{extra}</div>}
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
