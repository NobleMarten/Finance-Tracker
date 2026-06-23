import { useRef, useState } from 'react'

const THRESHOLD = 64   // px the user must pull before a refresh fires
const MAX_PULL = 96    // px the content can travel at most
const RESIST = 0.5     // drag resistance (lower = stiffer)

/**
 * Pull-to-refresh wrapper. Becomes the scroll container itself (pass the same
 * className you'd put on your `overflow-y-auto` div). Only engages when the
 * content is scrolled to the top and the drag is mostly vertical, so it coexists
 * with horizontal swipe gestures inside `children`.
 *
 * `onRefresh` should return a promise; the spinner stays until it settles.
 */
export default function PullToRefresh({ onRefresh, className = '', style, children }) {
  const scrollRef = useRef(null)
  const startY = useRef(0)
  const startX = useRef(0)
  const active = useRef(false)   // a valid pull gesture is in progress
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const onTouchStart = (e) => {
    if (refreshing) return
    const el = scrollRef.current
    active.current = !!el && el.scrollTop <= 0
    startY.current = e.touches[0].clientY
    startX.current = e.touches[0].clientX
  }

  const onTouchMove = (e) => {
    if (!active.current || refreshing) return
    const dy = e.touches[0].clientY - startY.current
    const dx = e.touches[0].clientX - startX.current

    // Cancel if scrolled away from the top, pulling up, or swiping sideways.
    if (dy <= 0 || (scrollRef.current && scrollRef.current.scrollTop > 0) || Math.abs(dx) > Math.abs(dy)) {
      active.current = false
      setPull(0)
      return
    }
    setPull(Math.min(MAX_PULL, dy * RESIST))
  }

  const onTouchEnd = async () => {
    if (!active.current) return
    active.current = false
    if (pull >= THRESHOLD) {
      setRefreshing(true)
      setPull(THRESHOLD)
      try {
        await onRefresh?.()
      } finally {
        setRefreshing(false)
        setPull(0)
      }
    } else {
      setPull(0)
    }
  }

  // Snap back smoothly when not actively dragging.
  const settle = !active.current
  const progress = Math.min(1, pull / THRESHOLD)

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      {/* Indicator — sits above the content, follows the pull */}
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
        style={{
          top: 0,
          transform: `translateY(${pull - 30}px)`,
          opacity: pull > 4 || refreshing ? 1 : 0,
          transition: settle ? 'transform 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s' : 'none',
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
        >
          <Spinner spinning={refreshing} progress={progress} />
        </div>
      </div>

      <div
        ref={scrollRef}
        className={className}
        style={{
          ...style,
          transform: `translateY(${pull}px)`,
          transition: settle ? 'transform 0.28s cubic-bezier(0.22,1,0.36,1)' : 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

function Spinner({ spinning, progress }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      className={spinning ? 'animate-spin-svg' : ''}
      style={{ transform: spinning ? undefined : `rotate(${progress * 270}deg)`, opacity: spinning ? 1 : 0.4 + progress * 0.6 }}
    >
      <circle cx="12" cy="12" r="9" stroke="var(--border-subtle)" strokeWidth="2.5" />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  )
}
