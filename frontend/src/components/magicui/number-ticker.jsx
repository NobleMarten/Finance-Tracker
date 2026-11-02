import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * Magic UI NumberTicker (https://magicui.design/docs/components/number-ticker),
 * trimmed to what the app needs. Springs from the previous value to the new one
 * and writes straight into the DOM node, so re-renders stay out of the loop.
 * `format` renders each frame; it receives the rounded number.
 */
export function NumberTicker({ value, format = (n) => String(n), className, delay = 0, ...props }) {
  const ref = useRef(null)
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { damping: 38, stiffness: 320, restDelta: 0.5 })
  const inView = useInView(ref, { once: true, margin: '0px' })
  const formatRef = useRef(format)
  formatRef.current = format

  useEffect(() => {
    if (!inView) return
    const id = setTimeout(() => motionValue.set(value), delay * 1000)
    return () => clearTimeout(id)
  }, [motionValue, inView, delay, value])

  useEffect(() => spring.on('change', (latest) => {
    if (ref.current) ref.current.textContent = formatRef.current(Math.round(latest))
  }), [spring])

  return (
    <span ref={ref} className={cn('inline-block tabular-nums', className)} {...props}>
      {format(0)}
    </span>
  )
}
