import { useState } from 'react'
import { KeyRound, LogOut, ChevronRight, Check } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { THEMES, getTheme, applyTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import ResponsiveSheet from './ResponsiveSheet'

/** Profile: who is signed in, gradient theme, API tokens, sign out. */
export default function ProfileSheet({ open, onOpenChange, onOpenTokens }) {
  const { user, logout } = useAuth()
  const email = user?.email ?? ''
  const initial = email.trim()[0]?.toUpperCase() ?? '?'

  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title="Профиль" dialogClassName="max-w-sm">
      <div className="px-5 pb-6 pt-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white" style={{ background: 'var(--navy-gradient)' }}>
            {initial}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Аккаунт</div>
            <div className="truncate text-[15px] font-semibold text-foreground" title={email}>{email || '—'}</div>
          </div>
        </div>

        <ThemePicker />

        <div className="mt-6 overflow-hidden rounded-2xl bg-card shadow-soft">
          <Row
            icon={<KeyRound className="h-[18px] w-[18px]" />}
            label="API-токены"
            onClick={() => { onOpenChange(false); onOpenTokens?.() }}
          />
          <div className="mx-4 h-px bg-border" />
          <Row
            icon={<LogOut className="h-[18px] w-[18px]" />}
            label="Выйти"
            danger
            onClick={() => { onOpenChange(false); logout() }}
          />
        </div>
      </div>
    </ResponsiveSheet>
  )
}

function Row({ icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted active:bg-muted"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${danger ? 'bg-destructive/10 text-destructive' : 'bg-primary/[0.07] text-primary'}`}>
        {icon}
      </span>
      <span className={`flex-1 text-[14px] font-semibold ${danger ? 'text-destructive' : 'text-foreground'}`}>{label}</span>
      {!danger && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  )
}

function ThemePicker() {
  const [current, setCurrent] = useState(getTheme)
  const pick = (id) => { applyTheme(id); setCurrent(id) }

  return (
    <div className="mt-6">
      <div className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Тема</div>
      <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Тема оформления">
        {THEMES.map(({ id, label, swatch }) => {
          const active = current === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(id)}
              className="group flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  'relative flex h-16 w-full items-center justify-center rounded-2xl ring-offset-2 ring-offset-background transition-[box-shadow,transform] duration-200 group-active:scale-95',
                  active ? 'ring-2 ring-foreground' : 'ring-1 ring-black/5',
                )}
                style={{ background: swatch }}
              >
                {active && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className={cn('text-[12px] font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
