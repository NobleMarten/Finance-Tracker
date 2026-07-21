import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { AUTH_USER_KEY } from '../constants/authStorage'
import { authApi } from '../api/api'
import { cacheClear } from '../utils/cache'

const AuthContext = createContext(null)

/**
 * The auth token now lives in an httpOnly cookie the browser manages — JS
 * cannot read it. So the client no longer stores a token. We keep only the
 * non-sensitive user profile (email/name) in localStorage as a hint for
 * routing/UI. The real source of truth is the server: any protected request
 * returns 401 when the cookie is missing/expired, which triggers logout.
 */
function readUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    const u = JSON.parse(raw)
    if (u && typeof u.email === 'string') return u
  } catch {
    /* ignore */
  }
  return null
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(readUser)

  const persistSession = useCallback((nextUser) => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_USER_KEY)
    cacheClear() // drop cached data so it can't leak to the next user on this device
    setUser(null)
  }, [])

  const login = useCallback(
    async (email, password, redirectTo = '/') => {
      await authApi.login(email, password)
      const name = email.includes('@') ? email.split('@')[0] : email
      persistSession({ email, name })
      navigate(redirectTo, { replace: true })
    },
    [navigate, persistSession]
  )

  const register = useCallback(
    async (loginName, email, password, redirectTo = '/') => {
      await authApi.register(loginName, email, password)
      persistSession({ email, name: loginName })
      navigate(redirectTo, { replace: true })
    },
    [navigate, persistSession]
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    clearSession()
    navigate('/login', { replace: true })
  }, [clearSession, navigate])

  // Server-driven expiry: api.js fires this when any request returns 401.
  // Clear the stale local session and send the user back to login.
  useEffect(() => {
    const onUnauthorized = () => {
      clearSession()
      navigate('/login', { replace: true })
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [clearSession, navigate])

  const isAuthenticated = Boolean(user)

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      isAuthenticated,
    }),
    [user, login, register, logout, isAuthenticated]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
