/**
 * Shared nav glyphs. Both shells draw the same three destinations — the phone's
 * BottomNav and the desktop Sidebar — so the paths live here instead of being
 * copied into each. `size` lets the sidebar run them slightly larger.
 */

export function HomeIcon({ active, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--accent)' : 'var(--text-tertiary)'}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="transition-colors duration-200"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

export function HistoryIcon({ active, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--accent)' : 'var(--text-tertiary)'}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="transition-colors duration-200"
    >
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

export function StatsIcon({ active, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? 'var(--accent)' : 'var(--text-tertiary)'}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="transition-colors duration-200"
    >
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

export function PlusIcon({ size = 16, stroke = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
