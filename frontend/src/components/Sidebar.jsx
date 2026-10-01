import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { HomeIcon, HistoryIcon, StatsIcon, PlusIcon, ThemeIcon } from './icons'
import { useTheme } from '../hooks/useTheme'

const NAV = [
  { screen: 0, label: 'Overview', Icon: HomeIcon },
  { screen: 1, label: 'History', Icon: HistoryIcon },
  { screen: 3, label: 'Statistics', Icon: StatsIcon },
]

/**
 * Desktop-only navigation rail. Replaces BottomNav above the desktop
 * breakpoint: the same three destinations plus Add, but always visible and
 * labelled, which is what a pointer-driven layout wants instead of a floating
 * bar that steals vertical space from the content.
 */
export default function Sidebar({ screen, onNavigate, onOpenTokens }) {
  return (
    <aside
      className="w-[248px] flex-shrink-0 flex flex-col"
      style={{
        borderRight: '1px solid var(--border-subtle)',
        background: 'linear-gradient(180deg, var(--sidebar-tint) 0%, transparent 60%)',
      }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-7 flex items-center gap-2.5">
        <div
          className="w-8 h-8 flex items-center justify-center flex-shrink-0"
          style={{
            borderRadius: '10px',
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-glow)',
            boxShadow: 'inset 0 1px 0 var(--highlight)',
          }}
        >
          <span
            className="text-[15px] font-semibold"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
          >
            ₽
          </span>
        </div>
        <div className="min-w-0">
          <div
            className="text-[14px] font-semibold leading-tight tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Finance
          </div>
          <div
            className="text-[10px] uppercase tracking-[0.16em] font-medium"
            style={{ color: 'var(--text-ghost)' }}
          >
            tracker
          </div>
        </div>
      </div>

      {/* Destinations */}
      <nav className="px-3 flex flex-col gap-1">
        {NAV.map(({ screen: s, label, Icon }) => (
          <NavItem
            key={s}
            active={screen === s}
            label={label}
            onClick={() => onNavigate(s)}
          >
            <Icon active={screen === s} size={17} />
          </NavItem>
        ))}
      </nav>

      {/* Primary action */}
      <div className="px-3 mt-5">
        <button
          onClick={() => onNavigate(2)}
          className="w-full h-10 flex items-center justify-center gap-2 text-[13px] font-medium transition-all duration-200 active:scale-[0.98]"
          style={{
            borderRadius: 'var(--radius-md)',
            background: screen === 2 ? 'var(--accent-soft)' : 'var(--accent)',
            color: screen === 2 ? 'var(--accent)' : '#fff',
            border: `1px solid ${screen === 2 ? 'var(--accent)' : 'transparent'}`,
            boxShadow: screen === 2 ? 'none' : '0 4px 16px var(--accent-glow)',
          }}
        >
          <PlusIcon size={14} stroke={screen === 2 ? 'var(--accent)' : '#fff'} />
          Add expense
        </button>
      </div>

      <div className="flex-1" />

      {/* Account */}
      <AccountBlock onOpenTokens={onOpenTokens} />
    </aside>
  )
}

function NavItem({ active, label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="relative w-full h-10 flex items-center gap-3 px-3 text-[13px] font-medium transition-colors duration-200"
      style={{
        borderRadius: 'var(--radius-md)',
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Accent rail on the active item — reads at a glance from across the room */}
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-200"
        style={{
          width: 2,
          height: active ? 18 : 0,
          borderRadius: '0 2px 2px 0',
          background: 'var(--accent)',
        }}
      />
      <span className="flex-shrink-0 flex items-center justify-center w-[17px]">{children}</span>
      {label}
    </button>
  )
}

function AccountBlock({ onOpenTokens }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const email = user?.email ?? ''
  const initial = email.trim()[0]?.toUpperCase() ?? '?'

  return (
    <div className="p-3 relative" ref={rootRef} style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-2 py-2 transition-colors duration-150"
        style={{
          borderRadius: 'var(--radius-md)',
          background: open ? 'var(--bg-elevated)' : 'transparent',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--bg-elevated)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-semibold"
          style={{
            background: 'var(--accent-soft)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--accent)',
          }}
        >
          {initial}
        </span>
        <span
          className="text-[12px] font-medium truncate flex-1 text-left"
          style={{ color: 'var(--text-secondary)' }}
          title={email}
        >
          {email}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0 transition-transform duration-200"
          style={{ color: 'var(--text-ghost)', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-3 right-3 bottom-[calc(100%-4px)] z-50 overflow-hidden animate-scale-in"
          style={{
            background: 'var(--bg-popover)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-menu-up)',
            transformOrigin: 'bottom center',
          }}
        >
          <div className="p-1.5">
            <MenuItem onClick={toggle}>
              <span className="flex items-center justify-between">
                {theme === 'light' ? 'Dark theme' : 'Light theme'}
                <ThemeIcon theme={theme} />
              </span>
            </MenuItem>
            <MenuItem onClick={() => { setOpen(false); onOpenTokens?.() }}>API tokens</MenuItem>
            <MenuItem onClick={() => { setOpen(false); logout() }}>Sign out</MenuItem>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </button>
  )
}
