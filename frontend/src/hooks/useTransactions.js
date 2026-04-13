import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/api'

export function useTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const normalize = (t) => ({
    ...t,
    description: t.title ?? t.description ?? '',
    ts: new Date(t.created_at),
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getTransactions()
      // backend returns { items: [...], total: N }
      const items = data?.items ?? data ?? []
      setTransactions(items.map(normalize))
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
    setTransactions(prev => [normalize(created), ...prev])
  }

  const remove = async (id) => {
    await api.deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  return { transactions, loading, error, add, remove, refresh: load }
}
