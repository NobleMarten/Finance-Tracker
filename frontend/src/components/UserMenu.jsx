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
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-sm font-semibold text-white shadow-md transition hover:border-gray-600 hover:bg-gray-700"
        style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.35)' }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Меню пользователя"
      >
        <span style={{ color: 'var(--accent)' }}>{initialFromEmail(email)}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-[300] min-w-[220px] overflow-hidden rounded-xl border border-gray-800 bg-gray-900 py-2 shadow-2xl"
          style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}
          role="menu"
        >
          <div className="border-b border-gray-800 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Пользователь
            </div>
            <div className="mt-1 truncate text-sm font-medium text-white" title={displayName}>
              {displayName}
            </div>
            {email && (
              <div className="mt-0.5 truncate text-xs text-gray-500" title={email}>
                {email}
              </div>
            )}
          </div>
          <div className="px-2 pt-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                logout()
              }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition hover:bg-gray-800"
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
