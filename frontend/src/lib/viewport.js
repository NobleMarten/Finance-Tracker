// Home-screen app (iOS standalone) with a black-translucent status bar: the
// page draws under the status bar, but iOS reports a viewport one status bar
// shorter than the screen, so a `position: fixed; inset: 0` frame leaves an
// unpainted band at the bottom. Publish the real screen height as --app-h and
// let .app-frame use it. In a normal browser tab nothing changes.
export function initViewport() {
  const standalone =
    window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches
  if (!standalone) return

  const root = document.documentElement
  root.classList.add('standalone')

  const update = () => {
    const { width, height } = window.screen
    const portrait = window.matchMedia('(orientation: portrait)').matches
    // iOS keeps screen.width/height in portrait terms; pick the side that is
    // vertical right now. Never go below what the viewport already gives us.
    const screenH = portrait ? Math.max(width, height) : Math.min(width, height)
    root.style.setProperty('--app-h', `${Math.max(screenH, window.innerHeight)}px`)
  }
  update()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
}
