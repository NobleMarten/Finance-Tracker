import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/api'
import { cacheGet, cacheSet } from '../utils/cache'

const CACHE_KEY = 'transactions'

const normalize = (t) => ({
  ...t,
  description: t.title ?? t.description ?? '',
  ts: new Date(t.created_at),
})

export function useTransactions() {
  // Hydrate instantly from the last cached list (re-normalize so `ts` is a Date
  // again after the JSON round-trip). No spinner when we already have data.
  const [transactions, setTransactions] = useState(() => {
    const cached = cacheGet(CACHE_KEY)
    return cached ? cached.map(normalize) : []
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
      const next = items.map(normalize)
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
    const created = await api.addTransaction(body)
    setTransactions(prev => {
      const next = [normalize(created), ...prev]
      persist(next)
      return next
    })
  }

  const update = async (id, payload) => {
    const body = {}
    if (payload.description !== undefined) body.title = payload.description
    if (payload.amount !== undefined) body.amount = payload.amount

    // We only send patching to backend, but backend returns the updated full expense
    const updated = await api.updateTransaction(id, body)

    setTransactions(prev => {
      const next = prev.map(t => (t.id === id ? normalize(updated) : t))
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
