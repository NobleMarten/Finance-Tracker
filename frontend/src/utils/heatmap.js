// Sequential single-hue heatmap ramp on the app accent (rgb 108,140,255).
// Dark theme only — validated against the dark surface. NOT a rainbow: one hue,
// increasing opacity ≈ increasing lightness/saturation over the dark background.
const ACCENT = '108, 140, 255'

// Opacity per level: index 0 is the "no spend" slot (handled separately).
const LEVEL_ALPHA = [0, 0.22, 0.42, 0.62, 0.9]

/** 0 = no spend, 1..4 = increasing intensity (quartiles of the day's share of max). */
export function heatLevel(amount, max) {
  if (!amount || amount <= 0 || !max || max <= 0) return 0
  const t = amount / max
  if (t <= 0.25) return 1
  if (t <= 0.5) return 2
  if (t <= 0.75) return 3
  return 4
}

/** Fill for a heatmap cell. Empty days get a muted surface, not white. */
export function heatColor(amount, max) {
  const lvl = heatLevel(amount, max)
  if (lvl === 0) return 'var(--bg-elevated)'
  return `rgba(${ACCENT}, ${LEVEL_ALPHA[lvl]})`
}
