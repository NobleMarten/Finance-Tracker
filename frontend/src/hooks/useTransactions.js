import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/api'
import { cacheGet, cacheSet } from '../utils/cache'
import { toSpentAt, toSpentAtKeepingTime, todayInput } from '../utils/date'

const CACHE_KEY = 'transactions'

/**
 * `spent_at` is when the money left the wallet, `created_at` is when the row was
 * written. Everything user-facing sorts and groups by the former; the fallback
 * keeps cached payloads from before the field existed readable.
 */
const normalize = (t) => ({
  ...t,
  description: t.title ?? t.description ?? '',
  ts: new Date(t.spent_at ?? t.created_at),
})

/** Newest spend first. Backdated rows arrive out of order, so we can't trust insertion order. */
const byNewest = (list) => [...list].sort((a, b) => b.ts - a.ts)

export function useTransactions() {
  // Hydrate instantly from the last cached list (re-normalize so `ts` is a Date
  // again after the JSON round-trip). No spinner when we already have data.
  const [transactions, setTransactions] = useState(() => {
    const cached = cacheGet(CACHE_KEY)
    return cached ? byNewest(cached.map(normalize)) : []
  })
  const [loading, setLoading] = useState(() => !cacheGet(CACHE_KEY))
  const [error, setError] = useState(null)

  const persist = (items) => cacheSet(CACHE_KEY, items)

  const load = useCallback(async () => {
    try {
      setError(null)
      const data = await api.getTransactions()
      // backend returns { items: [...], total: N }
      const items = data?.items ?? data ?? []
      const next = byNewest(items.map(normalize))
      setTransactions(next)
      persist(next)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const add = async (payload) => {
    const body = { title: payload.description || '', amount: payload.amount }
    // Only backdated adds carry a timestamp — for "today" the server's own now()
    // stays authoritative instead of inheriting a skewed client clock.
    if (payload.date && payload.date !== todayInput()) {
      body.spent_at = toSpentAt(payload.date)
    }
    const created = await api.addTransaction(body)
    setTransactions(prev => {
      const next = byNewest([normalize(created), ...prev])
      persist(next)
      return next
    })
  }

  const update = async (id, payload) => {
    const body = {}
    if (payload.description !== undefined) body.title = payload.description
    if (payload.amount !== undefined) body.amount = payload.amount
    // Absent means "leave the date alone" — the backend COALESCEs a null spent_at.
    // `baseTs` carries the expense's current timestamp so only the day moves.
    if (payload.date !== undefined) {
      body.spent_at = payload.baseTs
        ? toSpentAtKeepingTime(payload.date, payload.baseTs)
        : toSpentAt(payload.date)
    }

    // We only send patching to backend, but backend returns the updated full expense
    const updated = await api.updateTransaction(id, body)

    setTransactions(prev => {
      const next = byNewest(prev.map(t => (t.id === id ? normalize(updated) : t)))
      persist(next)
      return next
    })
  }

  const remove = async (id) => {
    await api.deleteTransaction(id)
    setTransactions(prev => {
      const next = prev.filter(t => t.id !== id)
      persist(next)
      return next
    })
  }

  return { transactions, loading, error, add, update, remove, refresh: load }
}
