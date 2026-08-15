import { useEffect } from 'react'

export default function Toast({ message, onClose, desktop = false }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  // On desktop nothing sits at the bottom edge to clear, so the toast tucks into
  // the bottom-right corner instead of floating over the middle of the content.
  return (
    <div
      className={
        desktop
          ? 'fixed bottom-7 right-7 z-50 animate-toast-in-right'
          : 'fixed bottom-[88px] left-1/2 -translate-x-1/2 z-50 animate-toast-in'
      }
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 20px',
        maxWidth: desktop ? '360px' : '280px',
        boxShadow: desktop ? '0 12px 32px rgba(0,0,0,0.45)' : undefined,
      }}
    >
      {/* Раньше здесь был whitespace-nowrap: короткие «+ 350 ₽ added» помещались,
          а текст ошибки просто обрезался по maxWidth. */}
      <span
        className="text-[13px] font-medium block"
        style={{ color: 'var(--text-primary)' }}
      >
        {message}
      </span>
    </div>
  )
}
