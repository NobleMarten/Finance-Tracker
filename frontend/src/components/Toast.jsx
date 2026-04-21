import { useEffect } from 'react'

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-toast-in"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 20px',
        maxWidth: '280px',
      }}
    >
      <span
        className="text-[13px] font-medium whitespace-nowrap"
        style={{ color: 'var(--text-primary)' }}
      >
        {message}
      </span>
    </div>
  )
}
