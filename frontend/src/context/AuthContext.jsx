import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../constants/authStorage'
import { authApi } from '../api/api'

const AuthContext = createContext(null)

function readToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

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
  const [token, setToken] = useState(readToken)
  const [user, setUser] = useState(readUser)

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const login = useCallback(
    async (email, password, redirectTo = '/') => {
      const nextToken = await authApi.login(email, password)
      const name = email.includes('@') ? email.split('@')[0] : email
      const nextUser = { email, name }
      persistSession(nextToken, nextUser)
      navigate(redirectTo, { replace: true })
    },
    [navigate, persistSession]
  )

  const register = useCallback(
    async (loginName, email, password, redirectTo = '/') => {
      const nextToken = await authApi.register(loginName, email, password)
      const nextUser = { email, name: loginName }
      persistSession(nextToken, nextUser)
      navigate(redirectTo, { replace: true })
    },
    [navigate, persistSession]
  )

  const logout = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [clearSession, navigate])

  const isAuthenticated = Boolean(token)

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      register,
      logout,
      isAuthenticated,
    }),
    [token, user, login, register, logout, isAuthenticated]
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
