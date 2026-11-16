// Gradient themes. Colours live in index.css under [data-theme='…'];
// `top` must equal that theme's --mesh-top — it paints the iOS status bar.
// index.html applies the saved theme before first paint (inline script);
// keep THEME_KEY and the ids in sync with it.
export const THEME_KEY = 'ft_theme'

export const THEMES = [
  { id: 'a', label: 'Океан', top: '#2c3f7d', swatch: 'linear-gradient(135deg, #b77fd0 0%, #4f8fdc 45%, #2b4080 100%)' },
  { id: 'b', label: 'Закат', top: '#24084a', swatch: 'linear-gradient(135deg, #3b1882 0%, #b21eca 60%, #f6956a 100%)' },
  { id: 'c', label: 'Лаванда', top: '#3a3466', swatch: 'linear-gradient(225deg, #d8b0e2 0%, #8a68a2 40%, #2c295c 100%)' },
]
export const DEFAULT_THEME = 'a'

const byId = (id) => THEMES.find(t => t.id === id)

export function getTheme() {
  try {
    const id = localStorage.getItem(THEME_KEY)
    return byId(id) ? id : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function applyTheme(id) {
  const theme = byId(id) ?? byId(DEFAULT_THEME)
  document.documentElement.dataset.theme = theme.id
  document
    .querySelector('meta[name="theme-color"][media="(max-width: 1023px)"]')
    ?.setAttribute('content', theme.top)
  try { localStorage.setItem(THEME_KEY, theme.id) } catch { /* private mode */ }
}
