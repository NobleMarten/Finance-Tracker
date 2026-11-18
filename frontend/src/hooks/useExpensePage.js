import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/api'

/** Independent keyset traversal for a day, a title group or large expenses. */
export function useExpensePage(filter, revision) {
  const key = JSON.stringify(filter)
  const [page, setPage] = useState(null)
  const currentPage = useRef(null)
  const request = useRef(null)
  const activeKey = `${key}:${revision}`

  const fetchPage = useCallback(async (append = false) => {
    if (append && request.current) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const current = append ? currentPage.current : null
    if (append && (!current?.nextCursor || current.key !== activeKey)) {
      request.current = null
      return
    }
    const pending = {
      key: activeKey, items: current?.items ?? [], nextCursor: current?.nextCursor ?? null,
      loaded: Boolean(current), loading: !append, loadingMore: append, error: null,
    }
    currentPage.current = pending
    setPage(pending)
    try {
      const result = await api.getTransactions({
        ...JSON.parse(key), limit: 20, cursor: current?.nextCursor, signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (!result || typeof result !== 'object') throw new Error('Сервер вернул некорректный список трат')
      const rawRows = Object.hasOwn(result, 'expense') ? result.expense : result.items
      const rows = rawRows === null ? [] : rawRows
      if (!Array.isArray(rows)) throw new Error('Сервер вернул некорректный список трат')
      const cursor = result.next_cursor ?? null
      if (cursor && (!Number.isInteger(cursor.id) || typeof cursor.spent_at !== 'string')) {
        throw new Error('Сервер вернул некорректный курсор')
      }
      if (append && cursor && cursor.id === current.nextCursor.id && cursor.spent_at === current.nextCursor.spent_at) {
        throw new Error('Не удалось перейти к следующей странице')
      }
      const seen = new Set(pending.items.map(t => t.id))
      const items = [...pending.items]
      for (const row of rows) {
        if (seen.has(row.id)) continue
        seen.add(row.id)
        items.push({
          ...row,
          description: row.title === 'Untitled' ? '' : row.title ?? '',
          ts: new Date(row.spent_at),
        })
      }
      const next = { ...pending, items, nextCursor: cursor, loaded: true, loading: false, loadingMore: false }
      currentPage.current = next
      setPage(next)
    } catch (error) {
      if (controller.signal.aborted) return
      const next = { ...pending, loading: false, loadingMore: false, error: error.message }
      currentPage.current = next
      setPage(next)
    } finally {
      if (request.current === controller) request.current = null
    }
  }, [key, activeKey])

  useEffect(() => {
    fetchPage()
    return () => {
      request.current?.abort()
      request.current = null
    }
  }, [fetchPage])

  const visible = page?.key === activeKey ? page : null
  return {
    items: visible?.items ?? [],
    loading: !visible || visible.loading,
    loaded: Boolean(visible?.loaded),
    loadingMore: Boolean(visible?.loadingMore),
    hasMore: Boolean(visible?.nextCursor),
    error: visible?.error,
    loadMore: () => fetchPage(true),
    retry: () => fetchPage(false),
  }
}
