export default function BottomNav({ screen, onNavigate }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-20 flex items-center justify-center px-6 z-40"
      style={{
        background: 'linear-gradient(to top, var(--bg-base) 60%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
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

      <button
        onClick={() => onNavigate(2)}
        className="absolute right-5 bottom-4 w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-all duration-200"
        style={{
          background: 'var(--accent)',
          boxShadow: '0 0 20px rgba(108, 140, 255, 0.3)',
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
      className="w-12 h-10 flex items-center justify-center transition-all duration-250"
      style={{
        borderRadius: 'var(--radius-md)',
        background: active ? 'var(--accent-soft)' : 'transparent',
      }}
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
      className="transition-colors duration-250"
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
      className="transition-colors duration-250"
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
