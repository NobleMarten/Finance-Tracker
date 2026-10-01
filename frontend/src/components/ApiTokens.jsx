import { useCallback, useEffect, useState } from 'react'
import { tokensApi } from '../api/api'

/** «2 hours ago» / «3 days ago» — точнее здесь не нужно и не бывает: сервер
 *  обновляет last_used_at не чаще раза в 10 минут. */
function relative(iso) {
  if (!iso) return 'never used'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 2) return 'just now'
  if (min < 60) return `${min} min ago`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/**
 * Управление персональными API-токенами.
 *
 * Полноэкранный слой поверх приложения, как DayDetail и EditExpense — открывается
 * из меню пользователя в нижней панели.
 */
export default function ApiTokens({ onClose }) {
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  //Плейнтекст живёт только в этом состоянии и только до закрытия карточки:
  // сервер его больше не отдаст, перезапросить список бесполезно.
  const [fresh, setFresh] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await tokensApi.list()
      setTokens(data?.items ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    const trimmed = name.trim()
    if (!trimmed || creating) return
    setCreating(true)
    try {
      setError(null)
      const created = await tokensApi.create(trimmed)
      setFresh(created)
      setCopied(false)
      setName('')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (id) => {
    try {
      setError(null)
      await tokensApi.revoke(id)
      // Если отзываем тот токен, который только что показали, — прячем карточку,
      // иначе на экране остаётся секрет от уже мёртвого ключа.
      setFresh(f => (f && f.id === id ? null : f))
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fresh.token)
      setCopied(true)
      navigator.vibrate?.(20)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col animate-fade-in-up"
      style={{
        background: 'var(--bg-base)',
        // absolute inset-0 отсчитывается от padding-бокса контейнера, поэтому
        // отступы под чёлку с него не наследуются — слой обязан задать их сам,
        // иначе шапка уезжает под статус-бар. Так же сделано в EditExpense.
        paddingTop: 'calc(env(safe-area-inset-top) + 20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pb-4 flex-shrink-0">
        <button
          onClick={onClose}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:scale-90 flex-shrink-0"
          style={{ background: 'var(--overlay)', border: '1px solid var(--border-subtle)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-[16px] font-medium" style={{ color: 'var(--text-primary)' }}>
          API tokens
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-10">
        <p className="text-[13px] font-light mb-5" style={{ color: 'var(--text-tertiary)' }}>
          For adding expenses from iOS Shortcuts without signing in. Each token acts
          on your behalf — revoke it if the device is lost.
        </p>

        {/* Create */}
        <div
          className="p-4 mb-5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div className="text-[11px] uppercase tracking-[0.16em] font-medium mb-3"
            style={{ color: 'var(--text-tertiary)' }}>
            new token
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') create() }}
            placeholder="what device is it for?"
            maxLength={100}
            className="w-full bg-transparent text-[14px] font-light outline-none pb-2 mb-4"
            style={{
              color: 'var(--text-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
              caretColor: 'var(--accent)',
            }}
          />
          <button
            onClick={create}
            disabled={!name.trim() || creating}
            className="w-full py-3 text-[11px] uppercase tracking-[0.18em] font-medium transition-all duration-200 flex items-center justify-center"
            style={{
              borderRadius: 'var(--radius-md)',
              background: name.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
              color: name.trim() ? '#fff' : 'var(--text-ghost)',
              border: `1px solid ${name.trim() ? 'var(--accent)' : 'var(--border-subtle)'}`,
              cursor: name.trim() && !creating ? 'pointer' : 'not-allowed',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? <span className="animate-spin-btn" /> : 'create token'}
          </button>
        </div>

        {/* Plaintext — показывается ровно один раз */}
        {fresh && (
          <div
            className="p-4 mb-5 animate-scale-in"
            style={{
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.16em] font-medium mb-2"
              style={{ color: 'var(--accent)' }}>
              copy it now
            </div>
            <p className="text-[12px] font-light mb-3" style={{ color: 'var(--text-secondary)' }}>
              This is the only time the token is shown. It is stored hashed — nobody,
              including the server, can read it again.
            </p>
            <div
              className="text-[12px] px-3 py-2.5 mb-3 break-all"
              style={{
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            >
              {fresh.token}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copy}
                className="flex-1 py-2.5 text-[11px] uppercase tracking-[0.16em] font-medium transition-colors"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  background: copied ? 'transparent' : 'var(--accent)',
                  color: copied ? 'var(--accent)' : '#fff',
                  border: '1px solid var(--accent)',
                  cursor: 'pointer',
                }}
              >
                {copied ? 'copied' : 'copy'}
              </button>
              <button
                onClick={() => setFresh(null)}
                className="px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] font-medium transition-colors"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                done
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-[13px] mb-4 px-3 py-2.5"
            style={{
              color: 'var(--danger)',
              background: 'var(--danger-soft)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-sm)',
            }}>
            {error}
          </div>
        )}

        {/* List */}
        <div className="text-[11px] uppercase tracking-[0.16em] font-medium mb-3"
          style={{ color: 'var(--text-tertiary)' }}>
          your tokens
        </div>

        {loading ? (
          <p className="text-[13px] py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
            loading…
          </p>
        ) : tokens.length === 0 ? (
          <p className="text-[13px] py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
            No tokens yet
          </p>
        ) : (
          tokens.map((t, i) => {
            const revoked = Boolean(t.revoked_at)
            return (
              <div
                key={t.token_id}
                className="flex items-start justify-between gap-3 py-3.5"
                style={{ borderTop: i > 0 ? '1px solid var(--border-muted)' : 'none' }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[14px] font-medium truncate"
                      style={{
                        color: revoked ? 'var(--text-ghost)' : 'var(--text-primary)',
                        textDecoration: revoked ? 'line-through' : 'none',
                      }}
                    >
                      {t.name}
                    </span>
                    {revoked && (
                      <span
                        className="text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 flex-shrink-0"
                        style={{
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--danger-soft)',
                          color: 'var(--danger)',
                          border: '1px solid var(--danger-border)',
                        }}
                      >
                        revoked
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    created {shortDate(t.created_at)} · {relative(t.last_used_at)}
                  </div>
                </div>

                {!revoked && (
                  <button
                    onClick={() => revoke(t.token_id)}
                    className="text-[11px] uppercase tracking-[0.14em] font-medium px-3 py-1.5 flex-shrink-0 transition-colors"
                    style={{
                      borderRadius: 'var(--radius-full)',
                      background: 'transparent',
                      color: 'var(--text-tertiary)',
                      border: '1px solid var(--border-muted)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--danger)'
                      e.currentTarget.style.borderColor = 'var(--danger-border)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--text-tertiary)'
                      e.currentTarget.style.borderColor = 'var(--border-muted)'
                    }}
                  >
                    revoke
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
