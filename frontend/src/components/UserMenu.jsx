import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

function initialFromEmail(email) {
  if (!email || typeof email !== 'string') return '?'
  const ch = email.trim()[0]
  return ch ? ch.toUpperCase() : '?'
}

export default function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const email = user?.email ?? ''
  const displayName = user?.name ?? email

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 active:scale-95"
        style={{
          background: open ? 'var(--accent-soft)' : 'var(--bg-elevated)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border-subtle)'}`,
          boxShadow: open ? '0 0 12px var(--accent-glow)' : 'none',
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Меню пользователя"
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = 'var(--border-muted)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
          {initialFromEmail(email)}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-[300] min-w-[220px] overflow-hidden animate-scale-in"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset',
          }}
          role="menu"
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div
              className="text-[10px] font-medium uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Пользователь
            </div>
            <div
              className="mt-1 truncate text-[13px] font-medium"
              style={{ color: 'var(--text-primary)' }}
              title={displayName}
            >
              {displayName}
            </div>
            {email && (
              <div
                className="mt-0.5 truncate text-[11px]"
                style={{ color: 'var(--text-tertiary)' }}
                title={email}
              >
                {email}
              </div>
            )}
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); logout() }}
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
