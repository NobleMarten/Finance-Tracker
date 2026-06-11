import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

function UserAvatar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const email = user?.email ?? ''
  const initial = email.trim()[0]?.toUpperCase() ?? '?'

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
        style={{
          background: open ? 'var(--accent-soft)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--border-subtle)'}`,
          boxShadow: open ? '0 0 12px var(--accent-glow)' : 'none',
        }}
      >
        <span className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
          {initial}
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 bottom-12 z-50 min-w-[200px] overflow-hidden animate-scale-in"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04)',
            transformOrigin: 'bottom left',
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] mb-1"
              style={{ color: 'var(--text-tertiary)' }}>
              Account
            </div>
            <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}
              title={email}>
              {email}
            </div>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => { setOpen(false); logout() }}
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BottomNav({ screen, onNavigate }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-20 flex items-center justify-between px-5 z-40"
      style={{
        background: 'linear-gradient(to top, var(--bg-base) 60%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Left — user avatar */}
      <UserAvatar />

      {/* Center — nav pill */}
      <div
        className="flex items-center p-1 gap-1"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <NavBtn active={screen === 0} onClick={() => onNavigate(0)}>
          <HomeIcon active={screen === 0} />
        </NavBtn>
        <NavBtn active={screen === 1} onClick={() => onNavigate(1)}>
          <HistoryIcon active={screen === 1} />
        </NavBtn>
      </div>

      {/* Right — add button */}
      <button
        onClick={() => onNavigate(2)}
        className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all duration-200"
        style={{
          background: 'var(--accent)',
          boxShadow: '0 0 20px var(--accent-glow)',
          animation: screen !== 2 ? 'subtlePulse 3s ease-in-out infinite' : 'none',
        }}
      >
        <PlusIcon />
      </button>
    </div>
  )
}

function NavBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-10 flex items-center justify-center transition-colors duration-200"
      style={{
        borderRadius: 'var(--radius-md)',
        background: active ? 'var(--accent-soft)' : 'transparent',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

function HomeIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--accent)' : 'var(--text-tertiary)'}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="transition-colors duration-200"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function HistoryIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--accent)' : 'var(--text-tertiary)'}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="transition-colors duration-200"
    >
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
