import { useEffect, useMemo, useState } from 'react'
import { Plus, CalendarMinus, Repeat2, UserRound, ChevronDown, ChevronRight, Receipt } from 'lucide-react'
import { api } from '../api/api'
import { useAuth } from '../context/AuthContext'
import PullToRefresh from './PullToRefresh'
import { NumberTicker } from './magicui/number-ticker'
import { Button } from './ui/button'
import TxRow from './TxRow'
import { dayHeading, toDateInput, yesterdayInput } from '../utils/date'
import { fmtRub, fmtUsd, greeting, scaledFontSize, titleOf, currentMonth } from '../utils/format'
import { cn } from '@/lib/utils'

const PERIODS = [
  { key: 'month', label: 'Месяц' },
  { key: 'week', label: 'Неделя' },
  { key: 'day', label: 'Сегодня' },
]

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

/** Period boundaries + totals, recomputed only when the list changes. */
function usePeriods(transactions) {
  return useMemo(() => {
    const now = new Date()
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const w0 = new Date(d0)
    w0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7))
    const m0 = new Date(now.getFullYear(), now.getMonth(), 1)

    const totals = { month: 0, week: 0, day: 0 }
    for (const t of transactions) {
      if (t.ts >= m0) totals.month += t.amount
      if (t.ts >= w0) totals.week += t.amount
      if (t.ts >= d0) totals.day += t.amount
    }
    const sorted = [...transactions].sort((a, b) => b.ts - a.ts)
    return { totals, sorted, w0, m0 }
  }, [transactions])
}

/** Recent rows grouped into «Сегодня» / «Вчера» / «28 октября». */
function groupByDay(items) {
  const groups = []
  for (const t of items) {
    const key = toDateInput(t.ts)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(t)
    else groups.push({ key, label: dayHeading(t.ts), items: [t] })
  }
  return groups
}

export default function Dashboard({
  transactions, onEdit, onRefresh, onNavigate, onAdd, onOpenProfile, desktop = false,
}) {
  const { user } = useAuth()
  const [rate, setRate] = useState(null)
  const [period, setPeriod] = useState('month')
  const [weekOpen, setWeekOpen] = useState(false)

  useEffect(() => {
    api.getRate('RUB', 'USD')
      .then(data => setRate(data?.rate ?? null))
      .catch(() => setRate(null))
  }, [])

  const { totals, sorted, w0, m0 } = usePeriods(transactions)
  const weekTx = useMemo(() => sorted.filter(t => t.ts >= w0).slice(0, 8), [sorted, w0])
  const recentGroups = useMemo(() => groupByDay(sorted.slice(0, desktop ? 12 : 8)), [sorted, desktop])

  const selectPeriod = (key) => {
    // A second tap on the active «Неделя» chip opens the week list — the old
    // dropdown on the week card.
    if (key === period && key === 'week') { setWeekOpen(o => !o); return }
    setPeriod(key)
    setWeekOpen(false)
  }

  const initial = user?.email?.trim()[0]?.toUpperCase() ?? '?'
  const value = totals[period]

  // Actions, not destinations: История / Статистика live in the nav already.
  const last = sorted[0]
  const actions = [
    { label: 'Добавить', Icon: Plus, onClick: () => onAdd?.(), primary: true },
    { label: 'Вчера', Icon: CalendarMinus, onClick: () => onAdd?.(yesterdayInput()), aria: 'Добавить расход за вчера' },
    {
      label: 'Повторить',
      Icon: Repeat2,
      onClick: last ? () => onAdd?.(null, { amount: last.amount, description: last.description ?? '' }) : null,
      aria: last ? `Повторить: ${titleOf(last)}, ${fmtRub(last.amount)}` : 'Повторить последнюю трату',
    },
    { label: 'Профиль', Icon: UserRound, onClick: onOpenProfile },
  ]

  const hero = (
    <Hero
      desktop={desktop}
      initial={initial}
      onOpenProfile={onOpenProfile}
      totals={totals}
      period={period}
      onSelect={selectPeriod}
      weekOpen={weekOpen && !desktop}
      weekTx={weekTx}
      onEdit={onEdit}
      value={value}
      usd={fmtUsd(value, rate)}
      actions={actions}
      sparkline={period === 'month' ? <MonthSparkline transactions={transactions} monthStart={m0} height={desktop ? 64 : 40} /> : null}
    />
  )

  if (desktop) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 pb-16 pt-8">
        <div className="grid grid-cols-3 items-start gap-5">
          <div className="col-span-2 flex min-w-0 flex-col gap-5">
            {hero}
            <section className="rounded-2xl bg-card px-6 pb-4 pt-5 shadow-soft">
              <RecentHeader onAll={() => onNavigate?.(1)} />
              <RecentList groups={recentGroups} onEdit={onEdit} onAdd={() => onAdd?.()} />
            </section>
          </div>
          <aside className="flex min-w-0 flex-col gap-5">
            <section className="rounded-2xl bg-card px-5 pb-3 pt-5 shadow-soft">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-[15px] font-bold tracking-tight">На этой неделе</h2>
                <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">{fmtRub(totals.week)}</span>
              </div>
              <WeekList items={weekTx} onEdit={onEdit} />
            </section>
            <section className="rounded-2xl bg-card p-5 shadow-soft">
              <div className="text-[12px] font-semibold text-muted-foreground">Сегодня</div>
              <div className="mt-1 text-[26px] font-semibold tracking-tight tabular-nums">{fmtRub(totals.day)}</div>
              <div className="mt-0.5 h-4 text-[12px] text-muted-foreground">{fmtUsd(totals.day, rate) ? `≈ ${fmtUsd(totals.day, rate)}` : ''}</div>
            </section>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={onRefresh} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {hero}
      {/* White sheet, tucked under the header's bottom edge. */}
      <section className="relative -mt-7 flex-1 rounded-t-[28px] bg-card px-5 pb-32 pt-6">
        <RecentHeader onAll={() => onNavigate?.(1)} />
        <RecentList groups={recentGroups} onEdit={onEdit} onAdd={() => onAdd?.()} />
      </section>
    </PullToRefresh>
  )
}

/* ─────────────────────────── header ─────────────────────────── */

function Hero({
  desktop, initial, onOpenProfile, totals, period, onSelect, weekOpen, weekTx, onEdit,
  value, usd, actions, sparkline,
}) {
  return (
    <header
      className={cn('on-navy relative flex-shrink-0 overflow-hidden text-white', desktop ? 'rounded-3xl px-8 pb-7 pt-7 shadow-[0_24px_48px_-24px_rgba(14,20,48,0.6)]' : 'px-5 pb-12')}
      style={{
        background: 'var(--navy-gradient)',
        paddingTop: desktop ? undefined : 'calc(env(safe-area-inset-top) + 18px)',
      }}
    >
      {/* Top row: greeting + avatar */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[12px] font-medium capitalize text-white/55">{currentMonth()}</div>
          <div className="text-[17px] font-semibold tracking-tight">{greeting()}</div>
        </div>
        {!desktop && (
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Профиль"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[14px] font-bold transition-transform active:scale-90"
          >
            {initial}
          </button>
        )}
      </div>

      {/* Period chips */}
      <div className="no-scrollbar -mx-5 mt-5 flex gap-1.5 overflow-x-auto px-5" role="tablist" aria-label="Период">
        {PERIODS.map(({ key, label }) => {
          const active = period === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-expanded={key === 'week' && !desktop ? weekOpen : undefined}
              onClick={() => onSelect(key)}
              className={cn(
                'flex h-8 flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-semibold transition-colors duration-200',
                active ? 'border-white bg-white text-primary' : 'border-white/15 bg-white/10 text-white/80 hover:bg-white/15',
              )}
            >
              <span>{label}</span>
              <span className={active ? 'text-primary/45' : 'text-white/35'}>·</span>
              <span className="tabular-nums">{fmtRub(totals[key])}</span>
              {key === 'week' && active && !desktop && (
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', weekOpen && 'rotate-180')} strokeWidth={2.4} />
              )}
            </button>
          )
        })}
      </div>

      {/* Big amount */}
      <div className="mt-6">
        <div
          className="whitespace-nowrap font-semibold leading-none tracking-[-0.03em]"
          style={{ fontSize: scaledFontSize(value, desktop ? 52 : 40, 28, 8) }}
          aria-live="polite"
        >
          <NumberTicker value={value} format={fmtRub} />
        </div>
        <div className="mt-2 h-4 text-[13px] font-medium text-white/55">{usd ? `≈ ${usd}` : ''}</div>
      </div>

      {/* Week list — the old week-card dropdown */}
      <div
        className="grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out"
        style={{ gridTemplateRows: weekOpen ? '1fr' : '0fr', opacity: weekOpen ? 1 : 0, marginTop: weekOpen ? 16 : 0 }}
      >
        {/* inert while collapsed: hidden rows must not take focus or clicks. */}
        <div className="overflow-hidden" {...(weekOpen ? {} : { inert: '' })}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-1.5">
            <WeekList items={weekTx} onEdit={onEdit} onNavy />
          </div>
        </div>
      </div>

      {sparkline && <div className={desktop ? '-mx-8 mt-4' : '-mx-5 mt-4'}>{sparkline}</div>}

      {/* Actions */}
      <div className={cn('mt-6 grid grid-cols-4', desktop ? 'max-w-md gap-4' : 'gap-2')}>
        {actions.map(({ label, Icon, onClick, primary, aria }) => (
          <button
            key={label}
            type="button"
            onClick={onClick ?? undefined}
            disabled={!onClick}
            aria-label={aria ?? label}
            className="group flex flex-col items-center gap-2 disabled:opacity-40"
          >
            <span
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-150 group-active:scale-90',
                primary
                  ? 'bg-white text-primary shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]'
                  : 'border border-white/15 bg-white/10 text-white group-hover:bg-white/15',
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={primary ? 2.4 : 1.9} />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/60">{label}</span>
          </button>
        ))}
      </div>
    </header>
  )
}

function WeekList({ items, onEdit, onNavy = false }) {
  if (items.length === 0) {
    return <p className={cn('py-3 text-center text-[12px]', onNavy ? 'text-white/50' : 'text-muted-foreground')}>На этой неделе трат нет</p>
  }
  return items.map((t, i) => (
    <button
      key={t.id}
      type="button"
      onClick={() => onEdit?.(t)}
      className={cn(
        'flex w-full items-center gap-3 px-1 py-2 text-left transition-colors',
        onNavy ? 'hover:bg-white/5' : 'hover:bg-muted',
        i > 0 && (onNavy ? 'border-t border-white/[0.07]' : 'border-t border-border/60'),
      )}
    >
      <span className={cn('w-5 flex-shrink-0 text-[11px] font-semibold', onNavy ? 'text-white/40' : 'text-muted-foreground')}>
        {WEEKDAYS[t.ts.getDay()]}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium', onNavy ? 'text-white/85' : 'text-foreground/80')}>
        {titleOf(t)}
      </span>
      <span className={cn('whitespace-nowrap text-[13px] font-semibold tabular-nums', onNavy ? 'text-white' : 'text-foreground')}>
        {fmtRub(t.amount)}
      </span>
    </button>
  ))
}

/* ─────────────────────────── recent ─────────────────────────── */

function RecentHeader({ onAll }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <h2 className="text-[17px] font-bold tracking-tight">Последние операции</h2>
      <button
        type="button"
        onClick={onAll}
        className="flex items-center gap-0.5 rounded-full py-1 pl-2.5 pr-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Все <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function RecentList({ groups, onEdit, onAdd }) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center animate-fade-in">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.06] text-primary">
          <Receipt className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <p className="text-[15px] font-semibold">Пока нет трат</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Добавьте первую — она появится здесь</p>
        <Button size="sm" className="mt-5 rounded-full px-4" onClick={onAdd}>
          <Plus strokeWidth={2.4} /> Добавить
        </Button>
      </div>
    )
  }

  let index = 0
  return groups.map(g => (
    <div key={g.key} className="mt-4 first:mt-3">
      <div className="mb-1 text-[12px] font-semibold text-muted-foreground">{g.label}</div>
      {g.items.map(t => (
        <TxRow key={t.id} t={t} onClick={() => onEdit?.(t)} delay={0.05 + (index++) * 0.03} />
      ))}
    </div>
  ))
}

/* ─────────────────────────── sparkline ─────────────────────────── */

function MonthSparkline({ transactions, monthStart, height = 40 }) {
  const now = new Date()
  const todayDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const daily = new Array(todayDay).fill(0)
  for (const t of transactions) {
    if (t.ts >= monthStart && t.ts <= now) {
      const d = t.ts.getDate()
      if (d >= 1 && d <= todayDay) daily[d - 1] += t.amount
    }
  }

  let acc = 0
  const cumulative = daily.map(v => (acc += v))
  const max = Math.max(...cumulative, 1)
  // The first days of a month draw a stub in the corner, not a trend.
  if (cumulative.length < 5) return null

  const W = 320
  const H = height
  const PAD = 2
  const denom = Math.max(1, daysInMonth - 1)
  const points = cumulative.map((v, i) => [PAD + (i / denom) * (W - 2 * PAD), H - PAD - (v / max) * (H - 2 * PAD)])
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${line} L${points[points.length - 1][0].toFixed(2)},${H} L${points[0][0].toFixed(2)},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full animate-fade-in" style={{ height: H }} aria-hidden="true">
      <defs>
        <linearGradient id="spark-navy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-navy)" />
      <path d={line} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ vectorEffect: 'non-scaling-stroke' }} />
    </svg>
  )
}
