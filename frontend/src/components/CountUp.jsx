import { useState, useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/useReducedMotion'

// ease-out-expo: fast start, soft landing — feels like the number "settles".
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

/**
 * Animates a number from its previously displayed value to `value`, formatting
 * each frame with `format`. First mount counts up from 0. Re-animates whenever
 * `value` changes (e.g. switching month / period). Respects reduced motion.
 *
 * Renders only the formatted number (no wrapper) — place suffixes like " ₽"
 * outside, so layout/width handling stays with the caller.
 */
export default function CountUp({ value, format = String, duration = 800 }) {
  const reduced = usePrefersReducedMotion()
  const [display, setDisplay] = useState(0)
  const displayRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (reduced) {
      displayRef.current = value
      setDisplay(value)
      return
    }
    const from = displayRef.current
    const to = value
    if (from === to) return

    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const v = from + (to - from) * easeOutExpo(t)
      displayRef.current = v
      setDisplay(v)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        displayRef.current = to
        setDisplay(to)
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration, reduced])

  return format(Math.round(display))
}
