import { useCallback, useRef } from 'react'

const LOCK = 10      // px before we decide whether the gesture is horizontal
const THRESHOLD = 50 // px of horizontal travel that counts as a page turn
const FOLLOW = 0.25  // how far the element trails the finger while dragging

/**
 * Horizontal swipe between periods, scoped to one element (the hero card).
 *
 * Swipe right → `onPrev` (back in time), swipe left → `onNext`. Pass `null`
 * for a direction that is unavailable (e.g. no future period).
 *
 * The direction is locked after the first few pixels: a mostly vertical drag is
 * left to the browser as a scroll and never turns the page, so brushing the
 * card while scrolling the list does nothing.
 *
 * Returns props to spread onto the element. `touch-action: pan-y` tells the
 * browser horizontal moves are ours; after a swipe the browser would still
 * deliver a click to whatever button the finger started on, so that click is
 * swallowed in the capture phase.
 */
export function useSwipeNav({ onPrev, onNext }) {
  const el = useRef(null)
  const start = useRef({ x: 0, y: 0 })
  const mode = useRef(null) // null = undecided, 'x' = swiping, 'y' = scrolling
  const suppressClick = useRef(false)

  const setShift = (dx, animate) => {
    const node = el.current
    if (!node) return
    node.style.transition = animate ? 'transform 0.25s ease-out' : 'none'
    node.style.transform = dx ? `translateX(${dx}px)` : ''
  }

  const onTouchStart = useCallback((e) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    mode.current = null
    suppressClick.current = false
  }, [])

  const onTouchMove = useCallback((e) => {
    const dx = e.touches[0].clientX - start.current.x
    const dy = e.touches[0].clientY - start.current.y
    if (mode.current === null) {
      if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return
      mode.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (mode.current !== 'x') return
    // Resist harder toward a direction that has nowhere to go.
    const blocked = (dx > 0 && !onPrev) || (dx < 0 && !onNext)
    setShift(dx * (blocked ? FOLLOW / 3 : FOLLOW), false)
  }, [onPrev, onNext])

  const onTouchEnd = useCallback((e) => {
    if (mode.current !== 'x') return
    const dx = e.changedTouches[0].clientX - start.current.x
    if (dx > THRESHOLD) onPrev?.()
    else if (dx < -THRESHOLD) onNext?.()
    setShift(0, true)
    // Even a swipe short of the threshold meant "flip", not "tap".
    suppressClick.current = true
    mode.current = null
  }, [onPrev, onNext])

  const onClickCapture = useCallback((e) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    e.stopPropagation()
    e.preventDefault()
  }, [])

  return {
    ref: el,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
    onClickCapture,
    style: { touchAction: 'pan-y' },
  }
}
