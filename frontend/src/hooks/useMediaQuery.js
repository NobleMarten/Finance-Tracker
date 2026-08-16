import { useSyncExternalStore } from 'react'

/**
 * Subscribes to a CSS media query and re-renders when it flips.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the first paint
 * then already knows the real breakpoint, so the desktop shell never mounts as
 * the mobile one and swaps a frame later.
 */
export function useMediaQuery(query) {
  const subscribe = (onChange) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false, // SSR / no window — assume mobile, the narrower layout
  )
}

/**
 * The one breakpoint that separates the two shells: below it the app is the
 * untouched phone layout (single column + bottom nav), at or above it the
 * desktop layout (sidebar + multi-column grid).
 *
 * `pointer: fine` keeps large tablets in the touch layout — a 1024px iPad in
 * landscape wants the phone UI with its swipe gestures, not a hover-driven one.
 */
export const DESKTOP_QUERY = '(min-width: 1024px) and (pointer: fine)'

export function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY)
}
