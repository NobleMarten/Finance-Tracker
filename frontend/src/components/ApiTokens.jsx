import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import { tokensApi } from '../api/api'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

/** «2 ч назад» / «3 дн. назад» — точнее здесь не нужно и не бывает: сервер
 *  обновляет last_used_at не чаще раза в 10 минут. */
function relative(iso) {
  if (!iso) return 'не использовался'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 2) return 'только что'
  if (min < 60) return `${min} мин назад`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.round(hours / 24)
  return days === 1 ? 'вчера' : `${days} дн. назад`
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/**
 * Управление персональными API-токенами.
 *
 * Тело sheet / dialog, открывается из профиля.
 */
export default function ApiTokens() {
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pb-3 pt-4 lg:pt-6">
        <h2 className="text-[18px] font-bold tracking-tight">API-токены</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Для добавления трат из «Быстрых команд» iOS без входа. Токен действует от вашего
          имени — отзовите его, если устройство потеряно.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        {/* Create */}
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-soft">
          <div className="mb-2 text-[12px] font-semibold text-muted-foreground">Новый токен</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') create() }}
            placeholder="Для какого устройства?"
            aria-label="Название токена"
            maxLength={100}
            className="mb-3 h-11 w-full rounded-xl bg-muted px-3.5 text-[14px] font-medium outline-none placeholder:font-normal placeholder:text-foreground/35 focus:ring-2 focus:ring-primary/25"
          />
          <Button onClick={create} disabled={!name.trim() || creating} className="w-full">
            {creating ? <span className="animate-spin-btn" /> : 'Создать токен'}
          </Button>
        </div>

        {/* Plaintext — показывается ровно один раз */}
        {fresh && (
          <div className="on-navy mb-4 rounded-2xl p-4 text-white animate-scale-in" style={{ background: 'var(--navy-gradient)' }}>
            <div className="mb-1 text-[13px] font-bold">Скопируйте сейчас</div>
            <p className="mb-3 text-[12px] text-white/65">
              Токен показывается один раз. Он хранится в виде хеша — прочитать его снова
              не сможет никто, включая сервер.
            </p>
            <div className="mb-3 break-all rounded-xl bg-white/10 px-3 py-2.5 font-mono text-[12px]">
              {fresh.token}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-semibold text-primary transition-transform active:scale-[0.98]"
              >
                {copied ? <><Check className="h-4 w-4" /> Скопировано</> : <><Copy className="h-4 w-4" /> Копировать</>}
              </button>
              <button
                type="button"
                onClick={() => setFresh(null)}
                className="h-10 rounded-xl border border-white/20 px-4 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/10"
              >
                Готово
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-[13px] font-medium text-destructive">
            {error}
          </div>
        )}

        {/* List */}
        <div className="mb-2 text-[12px] font-semibold text-muted-foreground">Ваши токены</div>
        <div className="rounded-2xl bg-card px-4 shadow-soft">
          {loading ? (
            [0, 1].map(i => (
              <div key={i} className="flex items-center gap-3 py-3.5">
                <Skeleton className="h-9 w-9" />
                <div className="flex-1"><Skeleton className="h-3.5 w-32" /><Skeleton className="mt-2 h-3 w-44" /></div>
              </div>
            ))
          ) : tokens.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/[0.06] text-primary">
                <KeyRound className="h-5 w-5" />
              </span>
              <p className="text-[14px] font-semibold">Токенов пока нет</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Создайте первый выше</p>
            </div>
          ) : (
            tokens.map((t, i) => {
              const revoked = Boolean(t.revoked_at)
              return (
                <div
                  key={t.token_id}
                  className={`flex items-center gap-3 py-3.5 ${i > 0 ? 'border-t border-border/70' : ''}`}
                >
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${revoked ? 'bg-muted text-foreground/30' : 'bg-primary/[0.07] text-primary'}`}>
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-[14px] font-semibold ${revoked ? 'text-foreground/35 line-through' : ''}`}>
                        {t.name}
                      </span>
                      {revoked && (
                        <span className="flex-shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          отозван
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      создан {shortDate(t.created_at)} · {relative(t.last_used_at)}
                    </div>
                  </div>
                  {!revoked && (
                    <Button variant="destructive" size="sm" className="h-8 rounded-full px-3 text-[12px]" onClick={() => revoke(t.token_id)}>
                      Отозвать
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
