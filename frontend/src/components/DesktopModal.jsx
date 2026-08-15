import { useEffect } from 'react'

/**
 * Desktop-only dialog frame: dimmed backdrop + a centred panel.
 *
 * The panel is `position: relative` and sized here, so a screen written for the
 * phone as `absolute inset-0` (ApiTokens, DayDetail) drops in unchanged and
 * simply fills the panel instead of the viewport.
 */
export default function DesktopModal({ onClose, width = 560, height = 'min(760px, 86vh)', children }) {
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key !== 'Escape') return
      // A DatePicker opened from inside this dialog owns Escape first —
      // it portals to body, so it is not in our subtree to check for.
      if (document.querySelector('[data-overlay="datepicker"]')) return
      onClose?.()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8 animate-fade-in"
      style={{ background: 'rgba(6,6,8,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        className="relative flex flex-col overflow-hidden animate-scale-in"
        style={{
          width,
          maxWidth: '100%',
          height,
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
