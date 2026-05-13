import { useState } from 'react'
import { Link } from 'react-router-dom'
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(108,140,255,0.12),transparent)]" />

      <div
        className="relative w-full max-w-[400px] rounded-2xl border border-gray-800 bg-gray-800/80 p-8 backdrop-blur-xl"
        style={{ boxShadow: '0 24px 80px -12px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04) inset' }}
      >
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Сброс пароля
          </h1>
          <p className="mt-3 text-left text-sm leading-relaxed text-gray-400">
            Пароль <span className="text-gray-300">никогда не отправляют</span> письмом — это небезопасно.
            После настройки почты на сервере сюда добавится отправка{' '}
            <span className="text-gray-300">одноразовой ссылки</span> для установки нового пароля.
          </p>
        </div>

        {done ? (
          <div
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-100"
            role="status"
          >
            Запрос принят. Когда почта будет подключена, на указанный email придёт письмо со ссылкой для
            сброса пароля. Сейчас запрос только записывается в журнал сервера (режим разработки).
          </div>
        ) : (
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
              <label htmlFor="forgot-email" className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Email аккаунта
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition focus:border-transparent focus:ring-2 focus:ring-[color:var(--accent)]"
                placeholder="you@example.com"
              />
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
              {pending ? 'Отправка…' : 'Отправить ссылку (когда будет готово)'}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-[color:var(--accent)] transition hover:underline">
            ← Назад ко входу
          </Link>
        </p>
      </div>
    </div>
  )
}
