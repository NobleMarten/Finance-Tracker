// Tiny localStorage-backed JSON cache for stale-while-revalidate: render the last
// known data instantly on launch, then refresh from the network in the background.
// Not for secrets — the auth token lives in an httpOnly cookie. Cleared on logout/401.
const PREFIX = 'ft:cache:'

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function cacheSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota / private mode — ignore, we just lose the instant-render optimisation */
  }
}

/** Remove every app cache entry (call on logout / 401 so data can't leak between users). */
export function cacheClear() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}
