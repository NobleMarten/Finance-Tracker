import { KeyRound, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ResponsiveSheet from './ResponsiveSheet'

/** Profile: who is signed in, API tokens, sign out. Replaces the old avatar popover. */
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
