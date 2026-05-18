import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register, isAuthenticated } = useAuth()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [loginName, setLoginName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await register(loginName.trim(), email.trim(), password, from)
    } catch (err) {
      setError(err?.message || 'Не удалось зарегистрироваться')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(108,140,255,0.12),transparent)]" />

      <div
        className="auth-card relative w-full max-w-[400px] rounded-2xl p-8"
        style={{ boxShadow: '0 24px 80px -12px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset' }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Регистрация
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Создайте аккаунт
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <div
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="reg-login" className="mb-2 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Логин
            </label>
            <input
              id="reg-login"
              type="text"
              autoComplete="username"
              required
              minLength={2}
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              className="auth-input w-full rounded-xl px-4 py-3 text-sm"
              placeholder="username"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="mb-2 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input w-full rounded-xl px-4 py-3 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="mb-2 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Пароль
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input w-full rounded-xl py-3 pl-4 pr-12 text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="auth-icon-btn absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 outline-none"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent)',
              boxShadow: '0 8px 24px -4px var(--accent-glow)',
            }}
          >
            {pending ? 'Создание…' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Уже есть аккаунт?{' '}
          <Link
            to="/login"
            className="font-medium text-[color:var(--accent)] transition hover:underline"
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
