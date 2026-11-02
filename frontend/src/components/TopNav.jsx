import { Plus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { screen: 0, label: 'Главная' },
  { screen: 1, label: 'История' },
  { screen: 3, label: 'Статистика' },
]

/** Desktop top bar: brand, tabs, primary action, profile avatar. */
export default function TopNav({ screen, onNavigate, onAdd, onOpenProfile }) {
  const { user } = useAuth()
  const initial = user?.email?.trim()[0]?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-8 px-6">
        <button type="button" onClick={() => onNavigate(0)} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[15px] font-bold text-white" style={{ background: 'var(--navy-gradient)' }}>
            ₽
          </span>
          <span className="text-[15px] font-bold tracking-tight text-foreground">Finance</span>
        </button>

        <nav className="flex items-center gap-1" aria-label="Основная навигация">
          {NAV.map(({ screen: s, label }) => (
            <button
              key={s}
              type="button"
              onClick={() => onNavigate(s)}
              aria-current={screen === s ? 'page' : undefined}
              className={cn(
                'h-9 rounded-full px-4 text-[13px] font-semibold transition-colors duration-150',
                screen === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Button size="sm" onClick={onAdd} className="h-9 rounded-full px-4">
            <Plus strokeWidth={2.4} /> Добавить
          </Button>
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Профиль"
            title={user?.email}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/[0.08] text-[13px] font-bold text-primary transition-colors hover:bg-primary/[0.14]"
          >
            {initial}
          </button>
        </div>
      </div>
    </header>
  )
}
