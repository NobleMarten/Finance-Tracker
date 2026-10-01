/**
 * Stable colour for a description's initial avatar. Hue is derived from the
 * text so "Coffee" is always the same colour; lightness/alpha come from theme
 * tokens so the pair stays readable on both light and dark surfaces.
 */
export function avatarColor(s) {
  if (!s || s === '—') return { bg: 'var(--bg-elevated)', fg: 'var(--text-tertiary)' }
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0
  }
  // Skip yellow band (40°–80°) — push hues in that range past it
  let hue = Math.abs(hash) % 320
  if (hue >= 40) hue += 40
  return {
    bg: `hsla(${hue}, 55%, 55%, var(--avatar-bg-a))`,
    fg: `hsl(${hue}, 65%, var(--avatar-fg-l))`,
  }
}
