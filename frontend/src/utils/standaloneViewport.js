/**
 * iOS home-screen app + `black-translucent` status bar: the page is drawn from
 * the very top of the screen, but the viewport that `position: fixed; inset: 0`
 * and `100%` resolve against is the screen *minus* the status bar. The shell
 * ends ~60pt short and the page background shows through under it — the grey
 * band at the bottom, with the nav riding above it.
 *
 * Fix: in standalone mode publish the real screen height as `--app-h` and size
 * the shell with it. `max` with innerHeight keeps us correct if a future iOS
 * stops shrinking the viewport; the keyboard shrinking innerHeight is ignored
 * on purpose (sheets are fixed to the bottom on their own).
 */
export function installStandaloneViewportFix() {
  const standalone = window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  if (!standalone) return

  const root = document.documentElement
  const fit = () => {
    // iOS keeps screen.width/height in portrait terms; pick by orientation.
    const landscape = window.innerWidth > window.innerHeight
    const { width, height } = window.screen
    const full = landscape ? Math.min(width, height) : Math.max(width, height)
    root.style.setProperty('--app-h', `${Math.max(full, window.innerHeight)}px`)
  }

  fit()
  window.addEventListener('resize', fit)
  window.addEventListener('orientationchange', fit)
}
