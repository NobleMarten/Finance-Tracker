import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { HomeIcon, HistoryIcon, StatsIcon, PlusIcon, ThemeIcon } from './icons'
import { useTheme } from '../hooks/useTheme'

function UserAvatar({ onOpenTokens }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
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
            boxShadow: 'var(--shadow-menu-up)',
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
              onClick={toggle}
              className="w-full rounded-lg px-3 py-2 flex items-center justify-between text-left text-[13px] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {theme === 'light' ? 'Dark theme' : 'Light theme'}
              <ThemeIcon theme={theme} />
            </button>
            <button
              onClick={() => { setOpen(false); onOpenTokens?.() }}
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              API tokens
            </button>
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

export default function BottomNav({ screen, onNavigate, onOpenTokens }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-20 flex items-center justify-between px-5 z-40"
      style={{
        /* No backdrop-filter: a fixed bar blurring the scrolling content beneath
           recomputes every frame and is the main scroll-jank source on iOS. The
           opaque gradient keeps the bar readable without the per-frame cost. */
        background: 'linear-gradient(to top, var(--bg-base) 72%, transparent)',
      }}
    >
      {/* Left — user avatar */}
      <UserAvatar onOpenTokens={onOpenTokens} />

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
        <NavBtn active={screen === 3} onClick={() => onNavigate(3)}>
          <StatsIcon active={screen === 3} />
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
      className="w-12 h-10 flex items-center justify-center transition-all duration-200 active:scale-90"
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

