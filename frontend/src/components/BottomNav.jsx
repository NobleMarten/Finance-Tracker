export default function BottomNav({ screen, onNavigate }) {
  return (
    <div className="relative h-14 flex items-center justify-center border-t border-[#141414] flex-shrink-0 px-7">
      <div className="flex items-center bg-[#111] rounded-[20px] p-1 gap-0.5">
        <NavBtn active={screen === 0} onClick={() => onNavigate(0)}>
          <HomeIcon active={screen === 0} />
        </NavBtn>
        <NavBtn active={screen === 1} onClick={() => onNavigate(1)}>
          <HistoryIcon active={screen === 1} />
        </NavBtn>
      </div>

      <button
        onClick={() => onNavigate(2)}
        className="absolute right-5 bottom-2 w-10 h-10 rounded-full bg-white flex items-center justify-center active:scale-95 transition-transform"
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
      className={`w-11 h-9 flex items-center justify-center rounded-2xl transition-colors ${
        active ? 'bg-[#1e1e1e]' : ''
      }`}
    >
      {children}
    </button>
  )
}

function HomeIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#fff' : '#2e2e2e'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function HistoryIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#fff' : '#2e2e2e'}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="#0b0b0b" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
