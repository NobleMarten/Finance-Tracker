import { useCallback, useState } from 'react'

/**
 * Light / dark switch.
 *
 * The initial theme is applied by the inline script in index.html before React
 * loads (otherwise a light-theme user sees a dark flash on every launch), so
 * this hook only reads what is already on <html> and writes changes back.
 */

const STORAGE_KEY = 'theme'
const META_COLOR = { dark: '#0A0A0B', light: '#F3F4F7' }

function current() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function apply(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme])
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private mode / blocked storage: the switch still works for this session.
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(current)

  const toggle = useCallback(() => {
    const next = current() === 'light' ? 'dark' : 'light'
    apply(next)
    setTheme(next)
  }, [])

  return { theme, toggle }
}
