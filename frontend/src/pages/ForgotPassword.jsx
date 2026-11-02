import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { authApi } from '../api/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await authApi.requestPasswordReset(email)
      setDone(true)
    } catch (err) {
      setError(err?.message || 'Не удалось отправить запрос')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell>
        <div className="mb-6">
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Сброс пароля
          </h1>
          <p className="mt-3 text-left text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Пароль <span style={{ color: 'var(--text-primary)' }}>никогда не отправляют</span> письмом — это небезопасно.
            После настройки почты на сервере сюда добавится отправка{' '}
            <span style={{ color: 'var(--text-primary)' }}>одноразовой ссылки</span> для установки нового пароля.
          </p>
        </div>

        {done ? (
          <div
            className="rounded-xl bg-success/10 px-4 py-3 text-sm leading-relaxed text-success"
            role="status"
          >
            Запрос принят. Когда почта будет подключена, на указанный email придёт письмо со ссылкой для
            сброса пароля. Сейчас запрос только записывается в журнал сервера (режим разработки).
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            {error && (
              <div
                className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="forgot-email" className="mb-2 block text-[13px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                Email аккаунта
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input w-full rounded-xl px-4 py-3.5 text-[15px]"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="h-[52px] w-full rounded-2xl text-[15px] font-semibold text-white transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: '0 12px 24px -12px rgba(14,20,48,0.6)',
              }}
            >
              {pending ? 'Отправка…' : 'Отправить ссылку (когда будет готово)'}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <Link to="/login" className="font-medium text-[color:var(--accent)] transition hover:underline">
            ← Назад ко входу
          </Link>
        </p>
    </AuthShell>
  )
}
