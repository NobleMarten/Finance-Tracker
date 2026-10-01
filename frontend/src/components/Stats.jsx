import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/api'
import { fmtShort, scaledFontSize } from '../utils/format'
import { usePrefersReducedMotion } from '../hooks/useReducedMotion'
import CountUp from './CountUp'
import PullToRefresh from './PullToRefresh'
import DayDetail from './DayDetail'
import YearHeatmap from './YearHeatmap'
import MonthlyTrend from './MonthlyTrend'

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

export default function Stats({ onAddExpense, transactions = [], onEdit, desktop = false }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [detailDay, setDetailDay] = useState(null) // drill-down: selected day number
  const [view, setView] = useState('bars') // 'bars' (default) | 'year' (contribution grid)
  const [chartSel, setChartSel] = useState(null) // pinned day number (bars)
  const [chartHover, setChartHover] = useState(null) // hovered day number (bars)
  const [yearHover, setYearHover] = useState(null) // hovered cell in year grid: { year, month, day, amount }
  const [yearSel, setYearSel] = useState(null) // tap-pinned cell in year grid (touch)
  const [trendSel, setTrendSel] = useState(null) // pinned month index in the trend
  const [trendHover, setTrendHover] = useState(null) // hovered month index in the trend

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

  function clearChartSel() {
    setChartSel(null); setChartHover(null)
    setYearHover(null); setYearSel(null)
    setTrendSel(null); setTrendHover(null)
  }

  const toggleYearSel = (cell) =>
    setYearSel(p => (p && p.month === cell.month && p.day === cell.day ? null : cell))

  function prevMonth() {
    setDetailDay(null); clearChartSel()
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    setDetailDay(null); clearChartSel()
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function changeView(v) { setView(v); clearChartSel() }

  // Jump from the year strip to a specific date's day detail.
  function goToDate(y, m, d) {
    clearChartSel()
    setYear(y); setMonth(m); setDetailDay(d)
  }

  // Jump from the monthly trend to a whole month.
  function goToMonth(y, m) {
    clearChartSel()
    setYear(y); setMonth(m)
  }

  const toggleSel = (day) => setChartSel(p => (p === day ? null : day))

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

  // The wide chart is laid out over the whole month, not just the elapsed part:
  // at full width a half-drawn axis reads as a bug, whereas the flat stubs for
  // days still to come read as exactly what they are.
  const dailyDataFull = Array.from({ length: getDaysInMonth(month, year) }, (_, i) => ({
    day: i + 1,
    amount: dailyMap[i + 1] ?? 0,
  }))

  const maxDayAmount = Math.max(...dailyData.map(d => d.amount), 0)
  const maxAmount = Math.max(maxDayAmount, 1)

  const monthShort = MONTHS_FULL[month - 1].slice(0, 3)
  const activeDay = chartHover ?? chartSel // hover wins over the pinned day
  const activeAmount = activeDay ? (dailyMap[activeDay] ?? 0) : 0
  const yearActive = yearHover ?? yearSel // year grid: hover wins over pinned cell

  // Monthly trend — last 6 months of totals, computed client-side from transactions.
  const TREND_N = 6
  const trendBase = new Date(now.getFullYear(), now.getMonth(), 1)
  const trendData = Array.from({ length: TREND_N }, (_, i) => {
    const d = new Date(trendBase.getFullYear(), trendBase.getMonth() - (TREND_N - 1 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: MONTHS_FULL[d.getMonth()].slice(0, 3), amount: 0 }
  })
  for (const t of transactions) {
    const b = trendData.find(m => m.year === t.ts.getFullYear() && m.month === t.ts.getMonth() + 1)
    if (b) b.amount += t.amount
  }
  const trendMax = Math.max(...trendData.map(m => m.amount), 1)
  const trendActive = trendHover ?? trendSel
  const trendItem = trendActive != null ? trendData[trendActive] : null
  const toggleTrendSel = (i) => setTrendSel(p => (p === i ? null : i))

  const delta =
    stats && stats.prevmonth > 0
      ? Math.round(((stats.currentmonth - stats.prevmonth) / stats.prevmonth) * 100)
      : null

  const isEmpty = stats && !loading && stats.currentmonth === 0

  const dayDetail = detailDay != null && (
    <DayDetail
      day={detailDay}
      month={month}
      year={year}
      monthName={MONTHS_FULL[month - 1]}
      transactions={transactions}
      onEdit={onEdit}
      onAddHere={onAddExpense}
      onClose={() => setDetailDay(null)}
      desktop={desktop}
    />
  )

  /* ── Desktop ──────────────────────────────────────────────── */
  if (desktop) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        <div className="mx-auto w-full max-w-[1480px] px-10 pt-8 pb-12">
          {/* Header — month navigation lives here rather than inside the hero,
              since it now steers three panels at once. */}
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Statistics
            </h1>
            <div
              className="flex items-center gap-1 p-1"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <button onClick={prevMonth} aria-label="Previous month"
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-elevated)]">
                <ChevronLeft />
              </button>
              <span
                className="text-[13px] font-medium px-3 min-w-[140px] text-center"
                style={{ color: 'var(--text-primary)' }}
              >
                {MONTHS_FULL[month - 1]} {year}
              </span>
              <button onClick={nextMonth} disabled={isCurrentMonth} aria-label="Next month"
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-20 hover:enabled:bg-[var(--bg-elevated)]">
                <ChevronRight />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-[13px]"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 min-[1100px]:grid-cols-3 gap-5 items-start">
            {/* ── Left rail: the figures ── */}
            <div className="flex flex-col gap-5 min-w-0">
              <div
                className="relative overflow-hidden animate-fade-in"
                style={{
                  background: 'linear-gradient(150deg, rgba(var(--accent-rgb),0.10) 0%, var(--bg-surface) 55%)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div className="absolute pointer-events-none"
                  style={{ top: -60, right: -50, width: 220, height: 220, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(var(--accent-rgb),0.12) 0%, transparent 70%)' }} />
                <div className="relative px-6 py-6">
                  <div className="text-[11px] uppercase tracking-[0.16em] font-medium mb-3"
                    style={{ color: 'var(--text-tertiary)' }}>
                    total spent
                  </div>
                  <div
                    className="font-medium whitespace-nowrap leading-none"
                    style={{
                      fontSize: scaledFontSize(stats?.currentmonth ?? 0, 42, 24, 8) + 'px',
                      letterSpacing: '-0.02em', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {loading
                      ? <span className="skeleton inline-block align-middle h-9 w-44" />
                      : <><CountUp value={stats?.currentmonth ?? 0} format={fmtShort} /> ₽</>}
                  </div>
                  {delta !== null && (
                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: delta > 0 ? 'var(--danger-soft)' : 'var(--success-soft)',
                          color: delta > 0 ? 'var(--danger)' : 'var(--success)',
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

              {stats && !loading && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in delay-1">
                  <StatCard label="Avg / day" value={stats.avgday} />
                  <StatCard label="Max / day" value={maxDayAmount} />
                  <StatCard label="Prev month" value={stats.prevmonth} />
                  <StatCard
                    label="vs prev"
                    value={null}
                    extra={delta !== null ? (
                      <span className="text-[18px] font-medium"
                        style={{ fontFamily: 'var(--font-mono)', color: delta > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}%
                      </span>
                    ) : (
                      <span className="text-[18px] font-medium"
                        style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>—</span>
                    )}
                  />
                </div>
              )}

              {stats && !loading && !isEmpty && (
                <Panel title="Top expenses" className="animate-fade-in delay-2">
                  <div className="px-6 pb-4 pt-1">
                    {(!stats.topexp || stats.topexp.length === 0) && (
                      <p className="text-[13px] pt-3" style={{ color: 'var(--text-tertiary)' }}>
                        No expenses this month
                      </p>
                    )}
                    {stats.topexp?.map((exp, i) => {
                      const pct = stats.currentmonth > 0
                        ? Math.round((exp.amount / stats.currentmonth) * 100)
                        : 0
                      return (
                        <div key={exp.id} className="py-3"
                          style={{ borderTop: i > 0 ? '1px solid var(--border-muted)' : 'none' }}>
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
                              <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                              <span className="text-[15px] font-medium whitespace-nowrap"
                                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>
                                <CountUp value={exp.amount} format={fmtShort} /> ₽
                              </span>
                            </div>
                          </div>
                          <ProgressBar pct={pct} index={i} />
                        </div>
                      )
                    })}
                  </div>
                </Panel>
              )}
            </div>

            {/* ── Main: the plots ── */}
            <div className="min-[1100px]:col-span-2 flex flex-col gap-5 min-w-0">
              {loading && <DesktopChartSkeleton />}

              {isEmpty && !loading && (
                <Panel>
                  <EmptyState
                    isCurrentMonth={isCurrentMonth}
                    monthName={MONTHS_FULL[month - 1]}
                    onAddExpense={onAddExpense}
                  />
                </Panel>
              )}

              {stats && !loading && !isEmpty && (
                <>
                  <Panel
                    className="animate-fade-in"
                    title={view === 'bars' ? 'Daily spending' : `This year · ${year}`}
                    action={
                      <div className="flex items-center gap-3">
                        {view === 'bars' ? (
                          activeAmount > 0 ? (
                            <ValuePill
                              onClick={() => setDetailDay(activeDay)}
                              label={`${activeDay} ${monthShort}`}
                              amount={activeAmount}
                              aria={`View expenses for ${activeDay} ${monthShort}`}
                            />
                          ) : <Hint>hover a bar</Hint>
                        ) : (
                          yearActive ? (
                            <ValuePill
                              onClick={() => goToDate(yearActive.year, yearActive.month, yearActive.day)}
                              label={`${yearActive.day} ${MONTHS_FULL[yearActive.month - 1].slice(0, 3)}`}
                              amount={yearActive.amount}
                              aria={`View expenses for ${yearActive.day} ${MONTHS_FULL[yearActive.month - 1].slice(0, 3)}`}
                            />
                          ) : <Hint>hover a day</Hint>
                        )}
                        <div className="flex p-0.5 gap-0.5"
                          style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <ViewBtn active={view === 'bars'} onClick={() => changeView('bars')} label="Bar chart view">
                            <BarsIcon />
                          </ViewBtn>
                          <ViewBtn active={view === 'year'} onClick={() => changeView('year')} label="Yearly heatmap view">
                            <GridIcon />
                          </ViewBtn>
                        </div>
                      </div>
                    }
                  >
                    <div className="px-6 py-6">
                      {view === 'bars' ? (
                        <BarChart
                          data={dailyDataFull}
                          maxAmount={maxAmount}
                          active={activeDay}
                          onSelect={toggleSel}
                          onHover={setChartHover}
                          plotW={900}
                          barH={200}
                          maxBar={24}
                          maxGap={9}
                          labelSize={11}
                          scrollable={false}
                        />
                      ) : (
                        <YearHeatmap
                          transactions={transactions}
                          year={year}
                          active={yearActive}
                          onSelect={toggleYearSel}
                          onHoverDate={setYearHover}
                          cellSize={15}
                        />
                      )}
                    </div>
                  </Panel>

                  <Panel
                    className="animate-fade-in delay-2"
                    title="Last 6 months"
                    action={
                      trendItem && trendItem.amount > 0 ? (
                        <ValuePill
                          onClick={() => goToMonth(trendItem.year, trendItem.month)}
                          label={`${trendItem.label} ${trendItem.year}`}
                          amount={trendItem.amount}
                          aria={`Go to ${trendItem.label} ${trendItem.year}`}
                        />
                      ) : <Hint>hover a month</Hint>
                    }
                  >
                    <div className="px-6 py-6">
                      <MonthlyTrend
                        data={trendData}
                        max={trendMax}
                        active={trendActive}
                        onSelect={toggleTrendSel}
                        onHover={setTrendHover}
                        trackHeight={132}
                        barMax={56}
                      />
                    </div>
                  </Panel>
                </>
              )}
            </div>
          </div>
        </div>

        {dayDetail}
      </div>
    )
  }

  /* ── Mobile ───────────────────────────────────────────────── */
  return (
    <div className="relative flex flex-col flex-1 min-h-0">
    <PullToRefresh onRefresh={loadStats} className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-24">

      {/* Hero summary card */}
      <div
        className="mx-4 mt-5 animate-fade-in relative"
        style={{
          background: 'linear-gradient(160deg, rgba(var(--accent-rgb),0.08) 0%, var(--bg-surface) 55%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Glow lives in its own clip layer so the card never clips the content */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: 'inherit' }}>
          <div className="absolute"
            style={{ top: -40, right: -40, width: 140, height: 140, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(var(--accent-rgb),0.10) 0%, transparent 70%)' }} />
        </div>

        {/* Month selector inside card */}
        <div className="relative flex items-center justify-between px-5 pt-5">
          <button onClick={prevMonth} aria-label="Previous month"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{ background: 'var(--overlay)', border: '1px solid var(--border-subtle)' }}>
            <ChevronLeft />
          </button>
          <div className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {MONTHS_FULL[month - 1]} {year}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth} aria-label="Next month"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-20 disabled:active:scale-100"
            style={{ background: 'var(--overlay)', border: '1px solid var(--border-subtle)' }}>
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
                  background: delta > 0 ? 'var(--danger-soft)' : 'var(--success-soft)',
                  color: delta > 0 ? 'var(--danger)' : 'var(--success)',
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
          style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
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
          {/* Daily bars ⇄ yearly contribution heatmap */}
          <div className="mx-4 mt-4 mb-5">
            {/* Header: title + view toggle */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {view === 'bars' ? 'Daily spending' : 'This year'}
                </span>
                {view === 'year' && (
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{year}</span>
                )}
              </div>
              <div
                className="flex p-0.5 gap-0.5"
                style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
              >
                <button
                  onClick={() => changeView('bars')}
                  aria-label="Bar chart view"
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-all active:scale-95"
                  style={{ background: view === 'bars' ? 'var(--accent-soft)' : 'transparent', color: view === 'bars' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                >
                  <BarsIcon />
                </button>
                <button
                  onClick={() => changeView('year')}
                  aria-label="Yearly heatmap view"
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-all active:scale-95"
                  style={{ background: view === 'year' ? 'var(--accent-soft)' : 'transparent', color: view === 'year' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                >
                  <GridIcon />
                </button>
              </div>
            </div>

            {view === 'bars' ? (
              <>
                {/* Active-day value — tap to open that day */}
                <div className="flex justify-end mb-3" style={{ minHeight: 18 }}>
                  {activeAmount > 0 ? (
                    <button
                      onClick={() => setDetailDay(activeDay)}
                      className="text-[12px] whitespace-nowrap flex items-center gap-1 rounded-md px-1.5 py-0.5 -mr-1.5 transition-colors active:scale-95"
                      style={{ background: 'var(--accent-soft)' }}
                      aria-label={`View expenses for ${activeDay} ${monthShort}`}
                    >
                      <span style={{ color: 'var(--accent)' }}>{activeDay} {monthShort} · </span>
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                        {fmtShort(activeAmount)} ₽
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
                <BarChart
                  data={dailyData}
                  maxAmount={maxAmount}
                  active={activeDay}
                  onSelect={toggleSel}
                  onHover={setChartHover}
                />
              </>
            ) : (
              <>
                {/* Active day's value — tap a square to pin it, tap the pill to open */}
                <div className="flex justify-end mb-3" style={{ minHeight: 18 }}>
                  {yearActive ? (
                    <button
                      onClick={() => goToDate(yearActive.year, yearActive.month, yearActive.day)}
                      className="text-[12px] whitespace-nowrap flex items-center gap-1 rounded-md px-1.5 py-0.5 -mr-1.5 transition-colors active:scale-95"
                      style={{ background: 'var(--accent-soft)' }}
                      aria-label={`View expenses for ${yearActive.day} ${MONTHS_FULL[yearActive.month - 1].slice(0, 3)}`}
                    >
                      <span style={{ color: 'var(--accent)' }}>
                        {yearActive.day} {MONTHS_FULL[yearActive.month - 1].slice(0, 3)} ·{' '}
                      </span>
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                        {fmtShort(yearActive.amount)} ₽
                      </span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--text-ghost)' }}>tap a day</span>
                  )}
                </div>
                <YearHeatmap
                  transactions={transactions}
                  year={year}
                  active={yearActive}
                  onSelect={toggleYearSel}
                  onHoverDate={setYearHover}
                />
              </>
            )}
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
                  style={{ fontFamily: 'var(--font-mono)', color: delta > 0 ? 'var(--danger)' : 'var(--success)' }}
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

          <div className="mx-5 mt-1" style={{ borderTop: '1px solid var(--border-subtle)' }} />

          {/* Monthly trend — last 6 months */}
          <div className="mx-4 mt-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Last 6 months
              </span>
              {trendItem && trendItem.amount > 0 ? (
                <button
                  onClick={() => goToMonth(trendItem.year, trendItem.month)}
                  className="text-[12px] whitespace-nowrap flex items-center gap-1 rounded-md px-1.5 py-0.5 -mr-1.5 transition-colors active:scale-95"
                  style={{ background: 'var(--accent-soft)' }}
                  aria-label={`Go to ${trendItem.label} ${trendItem.year}`}
                >
                  <span style={{ color: 'var(--accent)' }}>{trendItem.label} · </span>
                  <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                    {fmtShort(trendItem.amount)} ₽
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ) : (
                <span className="text-[11px]" style={{ color: 'var(--text-ghost)' }}>tap a month</span>
              )}
            </div>
            <MonthlyTrend
              data={trendData}
              max={trendMax}
              active={trendActive}
              onSelect={toggleTrendSel}
              onHover={setTrendHover}
            />
          </div>
        </>
      )}
    </PullToRefresh>

    {dayDetail}
    </div>
  )
}

/* ────────────────────────── desktop building blocks ────────────────────────── */

/** Titled card. `action` sits opposite the title in the header strip. */
function Panel({ title, action, className = '', children }) {
  return (
    <section
      className={className}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {(title || action) && (
        <div
          className="flex items-center justify-between gap-4 px-6 py-3.5"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2 className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

function ViewBtn({ active, onClick, label, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-7 h-7 flex items-center justify-center rounded-md transition-all"
      style={{
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-tertiary)',
      }}
    >
      {children}
    </button>
  )
}

/** The accent "27 Aug · 4 200 ₽ ›" chip that drills into a day or month. */
function ValuePill({ onClick, label, amount, aria }) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className="text-[12px] whitespace-nowrap flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
      style={{ background: 'var(--accent-soft)' }}
    >
      <span style={{ color: 'var(--accent)' }}>{label} · </span>
      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
        {fmtShort(amount)} ₽
      </span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}

function Hint({ children }) {
  return <span className="text-[11px]" style={{ color: 'var(--text-ghost)' }}>{children}</span>
}

function DesktopChartSkeleton() {
  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-lg)' }} />
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
          onClick={() => onAddExpense()}
          className="mt-6 px-5 h-10 rounded-full text-[13px] font-medium active:scale-95 transition-transform"
          style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 0 20px var(--accent-glow)' }}
        >
          Add expense
        </button>
      )}
    </div>
  )
}

/**
 * Daily bars. `plotW` is the width the bar geometry is fitted to (the svg then
 * scales to its container via the viewBox); `maxBar` / `maxGap` cap how fat the
 * bars may get, which is the only thing that differs between the two layouts.
 */
function BarChart({
  data, maxAmount, active, onSelect, onHover,
  plotW = 280, barH = 72, maxBar = 12, maxGap = 3, labelSize = 8, scrollable = true,
}) {
  const reduced = usePrefersReducedMotion()
  const [animated, setAnimated] = useState(false)
  const BAR_H = barH
  const slot = Math.floor(plotW / Math.max(data.length, 1))
  const barWidth = Math.max(4, Math.min(maxBar, slot - 2))
  const gap = Math.max(1, Math.min(maxGap, slot - barWidth))
  const totalW = data.length * (barWidth + gap) - gap
  const svgW = Math.max(totalW, plotW)
  const gradId = 'bar-grad'

  useEffect(() => {
    if (reduced) { setAnimated(true); return }
    setAnimated(false)
    const id = setTimeout(() => setAnimated(true), 30)
    return () => clearTimeout(id)
  }, [data, reduced])

  return (
    <div>
      {/* The phone keeps a horizontal scroll so bars stay tappable at a fixed
          minimum width; the desktop panel is wide enough to let the viewBox
          simply scale the whole month down to fit. */}
      <div style={{ overflowX: scrollable ? 'auto' : 'visible' }}>
      <svg
        viewBox={`0 0 ${svgW} ${BAR_H + labelSize * 2.25}`}
        width="100%"
        style={{ display: 'block', minWidth: scrollable ? Math.min(totalW, plotW) : 0, overflow: 'visible' }}
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
          const isActive = d.day === active
          const hasData = d.amount > 0
          const delay = i * 0.012

          return (
            <g
              key={d.day}
              onMouseEnter={() => hasData && onHover?.(d.day)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => hasData && onSelect?.(d.day)}
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
                  y={BAR_H + labelSize * 1.75}
                  textAnchor="middle"
                  fontSize={labelSize}
                  fontWeight={isActive ? 600 : 400}
                  fill={isActive ? 'var(--accent)' : 'var(--text-secondary)'}
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
          background: 'linear-gradient(90deg, rgba(var(--accent-rgb),0.5) 0%, var(--accent) 100%)',
          transition: reduced ? 'none' : 'width 0.6s cubic-bezier(0.34,1.1,0.64,1)',
        }}
      />
    </div>
  )
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function BarsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="6" width="4" height="14" rx="1" />
      <rect x="16" y="14" width="4" height="6" rx="1" />
    </svg>
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
