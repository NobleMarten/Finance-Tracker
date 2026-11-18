import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/api'
import { cacheGet, cacheSet } from '../utils/cache'
import { toSpentAt, toSpentAtKeepingTime, todayInput } from '../utils/date'

// Store rows and their continuation together; the old unpaginated cache cannot
// tell us where to resume. Never reuse it as a complete history.
const CACHE_KEY = 'transactions-pages-v1'
const PAGE_SIZE = 20
const normalize = (t) => {
  const title = t.title ?? t.description ?? ''
  return {
    ...t,
    description: title === 'Untitled' ? '' : title,
    ts: new Date(t.spent_at ?? t.created_at),
  }
}

function readPage(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Сервер вернул некорректный список трат')
  }
  const rows = Object.hasOwn(data, 'expense') ? data.expense : data.items
  if (rows !== null && !Array.isArray(rows)) {
    throw new Error('Сервер вернул некорректный список трат')
  }
  const cursor = data.next_cursor ?? null
  if (cursor && (!Number.isInteger(cursor.id) || cursor.id <= 0 || typeof cursor.spent_at !== 'string')) {
    throw new Error('Сервер вернул некорректный курсор')
  }
  return { items: (rows ?? []).map(normalize), nextCursor: cursor }
}

export function useTransactions() {
  const [page, setPage] = useState(() => {
    const cached = cacheGet(CACHE_KEY)
    return {
      items: Array.isArray(cached?.items) ? cached.items.map(normalize) : [],
      nextCursor: cached?.nextCursor ?? null,
      ready: false,
    }
  })
  const [refreshing, setRefreshing] = useState(true)
  const [summaryRevision, setSummaryRevision] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [moreError, setMoreError] = useState(null)
  const pageRef = useRef(page)
  const request = useRef(null)
  const generation = useRef(0)
  const mutating = useRef(0)
  const mounted = useRef(false)

  const commit = useCallback((next) => {
    pageRef.current = next
    setPage(next)
    cacheSet(CACHE_KEY, { items: next.items, nextCursor: next.nextCursor })
  }, [])

  const load = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const version = ++generation.current
    setRefreshing(true)
    setSummaryRevision(value => value + 1)
    setLoadingMore(false)
    setError(null)
    setMoreError(null)
    try {
      const data = await api.getTransactions({ limit: PAGE_SIZE, signal: controller.signal })
      if (version !== generation.current || controller.signal.aborted) return
      commit({ ...readPage(data), ready: true })
    } catch (e) {
      if (version === generation.current && !controller.signal.aborted) setError(e.message)
    } finally {
      if (version === generation.current) {
        request.current = null
        setRefreshing(false)
      }
    }
  }, [commit])

  const loadMore = useCallback(async () => {
    const current = pageRef.current
    if (request.current || mutating.current || !current.ready || !current.nextCursor) return
    const controller = new AbortController()
    request.current = controller
    const version = generation.current
    setLoadingMore(true)
    setMoreError(null)
    try {
      const data = await api.getTransactions({
        limit: PAGE_SIZE, cursor: current.nextCursor, signal: controller.signal,
      })
      if (version !== generation.current || controller.signal.aborted) return
      const next = readPage(data)
      if (next.nextCursor && next.nextCursor.id === current.nextCursor.id &&
          next.nextCursor.spent_at === current.nextCursor.spent_at) {
        throw new Error('Не удалось перейти к следующей странице. Обновите историю.')
      }
      // Rows may overlap when the history is changed between requests.
      const seen = new Set(current.items.map(t => t.id))
      const added = next.items.filter(t => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })
      commit({ items: [...current.items, ...added], nextCursor: next.nextCursor, ready: true })
    } catch (e) {
      if (version === generation.current && !controller.signal.aborted) setMoreError(e.message)
    } finally {
      if (version === generation.current) {
        request.current = null
        setLoadingMore(false)
      }
    }
  }, [commit])

  useEffect(() => {
    mounted.current = true
    load()
    return () => {
      mounted.current = false
      ++generation.current
      request.current?.abort()
      request.current = null
    }
  }, [load])

  // Changing spent_at can move a row across the cursor. After a mutation start
  // a fresh traversal rather than continuing with an obsolete page boundary.
  const mutate = async (action, apply) => {
    ++mutating.current
    ++generation.current
    request.current?.abort()
    request.current = null
    setLoadingMore(false)
    try {
      const result = await action()
      if (!mounted.current) return
      const current = pageRef.current
      commit({ ...current, items: apply(current.items, result), ready: false })
    } finally {
      --mutating.current
      if (mounted.current) await load()
    }
  }

  const add = async (payload) => {
    const body = { title: payload.description || '', amount: payload.amount }
    if (payload.date && payload.date !== todayInput()) body.spent_at = toSpentAt(payload.date)
    await mutate(() => api.addTransaction(body), (items, created) => [normalize(created), ...items])
  }

  const update = async (id, payload) => {
    const body = {}
    if (payload.description !== undefined) body.title = payload.description
    if (payload.amount !== undefined) body.amount = payload.amount
    if (payload.date !== undefined) {
      body.spent_at = payload.baseTs
        ? toSpentAtKeepingTime(payload.date, payload.baseTs)
        : toSpentAt(payload.date)
    }
    await mutate(() => api.updateTransaction(id, body), (items, updated) =>
      items.map(t => t.id === id ? normalize(updated) : t))
  }

  const remove = async (id) => {
    await mutate(() => api.deleteTransaction(id), items => items.filter(t => t.id !== id))
  }

  return {
    transactions: page.items,
    summaryRevision,
    nextCursor: page.nextCursor,
    hasMore: Boolean(page.nextCursor),
    historyReady: page.ready,
    loading: refreshing && page.items.length === 0,
    refreshing, loadingMore, error, moreError,
    add, update, remove, refresh: load, loadMore,
  }
}
