const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  getTransactions: () => req('/expenses'),
  addTransaction: (data) => req('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id) => req(`/expenses/${id}`, { method: 'DELETE' }),
  updateTransaction: (id, data) => req(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getRate: (from = 'RUB', to = 'USD') => req(`/rate?from=${from}&to=${to}`),
}
