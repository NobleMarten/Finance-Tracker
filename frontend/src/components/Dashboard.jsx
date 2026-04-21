import { useState, useEffect } from 'react'
import { fmtFull, fmtShort, scaledFontSize, greeting, currentMonth } from '../utils/format'
import { api } from '../api/api'

export default function Dashboard({ transactions }) {
  const [rate, setRate] = useState(null)
  const [weekExpanded, setWeekExpanded] = useState(false)

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
      ? (rub * rate).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      : null

  const recent = [...transactions].sort((a, b) => b.ts - a.ts).slice(0, 6)

  // Week transactions for mini-history (last 5)
  const weekTx = [...transactions]
    .filter(t => t.ts >= w0)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5)

  const fmtWeekDay = (date) => {
    const d = new Date(date)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[d.getDay()]
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Month label */}
      <div className="px-6 pt-6 animate-fade-in delay-1">
        <span
          className="text-[11px] uppercase tracking-[0.18em] font-medium"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {currentMonth()}
        </span>
      </div>

      {/* Greeting */}
      <div
        className="px-6 pt-3 text-[16px] font-light animate-fade-in delay-2 animate-text-glow"
        style={{ color: 'var(--text-secondary)' }}
      >
        {greeting()}
      </div>

      {/* Month total — hero section */}
      <div className="px-6 pt-6 pb-5 animate-fade-in delay-3">
        <div
          className="text-[11px] uppercase tracking-[0.16em] font-medium mb-3"
          style={{ color: 'var(--text-tertiary)' }}
        >
          this month
        </div>
        <div
          className="leading-none overflow-hidden whitespace-nowrap font-semibold animate-text-glow"
          style={{
            fontSize: scaledFontSize(monthVal, 42, 26, 7) + 'px',
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
          }}
        >
          {fmtFull(monthVal)}
        </div>
        {toUSD(monthVal) && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.12em]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              USD
            </span>
            <span className="text-[12px] animate-text-glow" style={{ color: 'var(--text-secondary)' }}>
              ≈ {toUSD(monthVal)}
            </span>
          </div>
        )}
      </div>

      {/* Week / Today cards */}
      <div className="px-6 animate-fade-in delay-4">
        <div className="flex gap-3">
          {/* Week card — clickable, expands sparkline */}
          <div
            className="flex-1 surface p-4 cursor-pointer transition-all duration-300"
            onClick={() => setWeekExpanded(e => !e)}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="text-[11px] uppercase tracking-[0.14em] font-medium"
                style={{ color: 'var(--text-tertiary)' }}
              >
                week
              </div>
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="transition-transform duration-500"
                style={{
                  color: 'var(--text-tertiary)',
                  transform: weekExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div
              className="overflow-hidden whitespace-nowrap font-medium"
              style={{
                fontSize: scaledFontSize(weekVal, 22, 15, 6) + 'px',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              {fmtShort(weekVal)}
            </div>
            {toUSD(weekVal) && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {toUSD(weekVal)}
              </div>
            )}

            {/* Mini week history — expands on click */}
            <div
              className="transition-all duration-500"
              style={{
                maxHeight: weekExpanded ? '200px' : '0px',
                opacity: weekExpanded ? 1 : 0,
                marginTop: weekExpanded ? '10px' : '0px',
                overflow: 'hidden',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {weekTx.length === 0 ? (
                <p className="text-[11px] py-2" style={{ color: 'var(--text-ghost)' }}>
                  no expenses this week
                </p>
              ) : (
                weekTx.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-1.5"
                    style={{
                      borderTop: i > 0 ? '1px solid var(--border-muted)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-ghost)' }}>
                        {fmtWeekDay(t.ts)}
                      </span>
                      <span className="text-[11px] font-light truncate" style={{ color: 'var(--text-secondary)' }}>
                        {t.description || '—'}
                      </span>
                    </div>
                    <span className="text-[12px] font-medium pl-2 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                      {fmtShort(t.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today card — static */}
          <StatCard label="today" value={dayVal} usd={toUSD(dayVal)} />
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 mt-5" style={{ borderTop: '1px solid var(--border-subtle)' }} />

      {/* Recent transactions */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 animate-fade-in delay-5">
        <div
          className="text-[11px] uppercase tracking-[0.14em] font-medium py-4"
          style={{ color: 'var(--text-tertiary)' }}
        >
          recent
        </div>
        {recent.length === 0 && (
          <p className="text-[13px] pt-2" style={{ color: 'var(--text-ghost)' }}>
            no expenses yet
          </p>
        )}
        {recent.map((t, i) => (
          <div
            key={t.id}
            className={`flex justify-between items-center py-3 animate-fade-in`}
            style={{
              borderTop: '1px solid var(--border-muted)',
              animationDelay: `${0.3 + i * 0.05}s`,
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }}
              >
                {(t.description || '—')[0].toUpperCase()}
              </div>
              <span
                className="text-[13px] font-light truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t.description || '—'}
              </span>
            </div>
            <span
              className="text-[15px] font-medium whitespace-nowrap pl-3"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
            >
              {fmtShort(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, usd }) {
  return (
    <div className="flex-1 surface p-4">
      <div
        className="text-[11px] uppercase tracking-[0.14em] font-medium mb-2"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </div>
      <div
        className="overflow-hidden whitespace-nowrap font-medium"
        style={{
          fontSize: scaledFontSize(value, 22, 15, 6) + 'px',
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}
      >
        {fmtShort(value)}
      </div>
      {usd && (
        <div className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {usd}
        </div>
      )}
    </div>
  )
}
