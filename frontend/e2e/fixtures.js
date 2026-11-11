const DAY = 86_400_000

function at(daysAgo, hours, minutes) {
  const d = new Date(Date.now() - daysAgo * DAY)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

let nextId = 100
export const expenses = [
  { title: 'Кофе', amount: 320, spent_at: at(0, 9, 12) },
  { title: 'Такси', amount: 680, spent_at: at(0, 8, 40) },
  { title: 'Untitled', amount: 150, spent_at: at(1, 19, 5) },
  { title: 'Продукты', amount: 2_840, spent_at: at(1, 18, 30) },
  { title: 'Обед', amount: 540, spent_at: at(2, 13, 15) },
  { title: 'Кино', amount: 900, spent_at: at(3, 21, 0) },
  { title: 'Аптека', amount: 1_210, spent_at: at(5, 11, 20) },
  { title: 'Спортзал', amount: 4_500, spent_at: at(9, 7, 30) },
  { title: 'Книги', amount: 1_390, spent_at: at(14, 16, 0) },
  { title: 'Продукты', amount: 3_120, spent_at: at(20, 18, 0) },
  { title: 'Связь', amount: 600, spent_at: at(34, 10, 0) },
  { title: 'Продукты', amount: 2_400, spent_at: at(40, 18, 0) },
].map(e => ({ id: nextId++, user_id: 1, created_at: e.spent_at, ...e }))

function stats() {
  const now = new Date()
  const m0 = new Date(now.getFullYear(), now.getMonth(), 1)
  const cur = expenses.filter(e => new Date(e.spent_at) >= m0)
  const byDay = new Map()
  for (const e of cur) {
    const d = new Date(e.spent_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    byDay.set(key, (byDay.get(key) ?? 0) + e.amount)
  }
  const total = cur.reduce((s, e) => s + e.amount, 0)
  return {
    daily: [...byDay].map(([date, amount]) => ({ date, amount })),
    topexp: [...cur].sort((a, b) => b.amount - a.amount).slice(0, 3),
    avgday: byDay.size ? Math.round(total / byDay.size) : 0,
    currentmonth: total,
    prevmonth: 9_800,
  }
}

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

/** Signed-in session + mocked backend. */
export async function mockApi(page, { signedIn = true } = {}) {
  if (signedIn) {
    await page.addInitScript(() => {
      localStorage.setItem('ft_auth_user', JSON.stringify({ email: 'boris@example.com', name: 'boris' }))
    })
  }
  // Predicate, not a glob: '**/api/**' would also catch the Vite module /src/api/api.js.
  await page.route((url) => url.pathname.startsWith('/api/'), (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/expenses' && req.method() === 'GET') return json(route, { items: expenses, total: expenses.length })
    if (p === '/api/expenses' && req.method() === 'POST') {
      const body = req.postDataJSON()
      return json(route, { id: nextId++, user_id: 1, created_at: new Date().toISOString(), ...body }, 201)
    }
    if (p.startsWith('/api/expenses/')) return json(route, {})
    if (p === '/api/rate') return json(route, { rate: 0.0124 })
    if (p === '/api/stats') return json(route, stats())
    if (p === '/api/v1/tokens') {
      return json(route, { items: [{ token_id: 1, name: 'iPhone Shortcuts', created_at: at(30, 10, 0), last_used_at: at(0, 8, 0) }] })
    }
    return json(route, {})
  })
}
