import { House, Clock3, ChartColumn, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { screen: 0, label: 'Главная', Icon: House },
  { screen: 1, label: 'История', Icon: Clock3 },
  { screen: 3, label: 'Статистика', Icon: ChartColumn },
]

/**
 * Floating white pill: Главная · (+) · История · Статистика.
 * Sits above the home indicator via safe-area; no backdrop-filter (scroll jank on iOS).
 */
export default function BottomNav({ screen, onNavigate, onAdd }) {
  const [home, history, stats] = ITEMS
  return (
    <nav
      aria-label="Основная навигация"
      className="absolute left-1/2 z-40 -translate-x-1/2"
      // Slightly into the home-indicator inset — tuned on device with Web Inspector.
      style={{ bottom: 'calc(env(safe-area-inset-bottom) - 10px)' }}
    >
      <div className="flex items-center gap-1 rounded-full bg-card p-1.5 shadow-float ring-1 ring-black/[0.04]">
        <NavBtn item={home} active={screen === home.screen} onClick={() => onNavigate(home.screen)} />
        <button
          type="button"
          onClick={onAdd}
          aria-label="Добавить расход"
          className="mx-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_-6px_rgba(14,20,48,0.6)] transition-transform duration-150 active:scale-90"
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} />
        </button>
        <NavBtn item={history} active={screen === history.screen} onClick={() => onNavigate(history.screen)} />
        <NavBtn item={stats} active={screen === stats.screen} onClick={() => onNavigate(stats.screen)} />
      </div>
    </nav>
  )
}

function NavBtn({ item: { label, Icon }, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-200 active:scale-90',
        active ? 'bg-primary/[0.07] text-primary' : 'text-foreground/40 hover:text-foreground/70',
      )}
    >
      <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.9} />
    </button>
  )
}
