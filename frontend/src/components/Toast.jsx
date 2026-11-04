import { useEffect } from 'react'
import { Check, CircleAlert } from 'lucide-react'

/**
 * Navy pill toast. `message` is a string or { text, tone: 'error' }.
 * Mobile: centred above the floating nav. Desktop: bottom-right corner.
 */
export default function Toast({ message, onClose, desktop = false }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2600)
    return () => clearTimeout(timer)
  }, [onClose])

  const text = typeof message === 'string' ? message : message?.text
  const error = typeof message === 'object' && message?.tone === 'error'

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        desktop
          ? 'fixed bottom-7 right-7 z-[60] animate-toast-in-right'
          : 'fixed left-1/2 z-[60] -translate-x-1/2 animate-toast-in'
      }
      style={desktop ? undefined : { bottom: 'calc(env(safe-area-inset-bottom) + 70px)' }}
    >
      <div
        className="flex items-center gap-2.5 rounded-full py-2.5 pl-2.5 pr-5 text-white shadow-[0_16px_40px_-12px_rgba(14,20,48,0.55)]"
        style={{ background: 'var(--navy-gradient)', maxWidth: desktop ? 380 : 320 }}
      >
        <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${error ? 'bg-[#ff6b72]' : 'bg-white/15'}`}>
          {error ? <CircleAlert className="h-3.5 w-3.5" strokeWidth={2.6} /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <span className="text-[13px] font-semibold leading-snug">{text}</span>
      </div>
    </div>
  )
}
