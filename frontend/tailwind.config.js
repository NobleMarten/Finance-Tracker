/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Design tokens — all mapped to the CSS custom properties in index.css :root,
      // which stays the single source of truth. Nothing changes visually; these just
      // expose the existing tokens as first-class Tailwind utilities.
      backgroundColor: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        ghost: 'var(--text-ghost)',
        accent: 'var(--accent)',
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        muted: 'var(--border-muted)',
        accent: 'var(--accent)',
      },
      ringColor: {
        accent: 'var(--accent)',
      },
      boxShadow: {
        glow: '0 0 20px var(--accent-glow)',
      },
      // Semantic radii — deliberately NOT sm/md/lg (those Tailwind defaults are in use).
      borderRadius: {
        chip: 'var(--radius-sm)', // 10 — pills / small
        card: 'var(--radius-md)', // 14 — cards / surfaces
        panel: 'var(--radius-lg)', // 18 — hero / large panels
      },
      fontFamily: {
        ui: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      // Numeric px scale — does not collide with the default xs/sm/base/lg/xl keys.
      fontSize: {
        10: '10px',
        11: '11px',
        12: '12px',
        13: '13px',
        14: '14px',
        15: '15px',
        16: '16px',
        18: '18px',
        22: '22px',
      },
    },
  },
  plugins: [],
}
