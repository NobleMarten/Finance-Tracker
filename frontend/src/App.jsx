import { useState } from 'react'
import { useTransactions } from './hooks/useTransactions'
import { useIsDesktop } from './hooks/useMediaQuery'
import Dashboard from './components/Dashboard'
import History from './components/History'
import AddExpense from './components/AddExpense'
import EditExpense from './components/EditExpense'
import Stats from './components/Stats'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import DesktopModal from './components/DesktopModal'
import Toast from './components/Toast'
import OfflineBanner from './components/OfflineBanner'
import ApiTokens from './components/ApiTokens'
import { fmtShort } from './utils/format'
import { dayLabel, todayInput } from './utils/date'

export default function App() {
  const [screen, setScreen] = useState(0)
  const { transactions, loading, error, add, update, remove, refresh } = useTransactions()
  const [toast, setToast] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  // Pre-selected day for the add screen, set when you jump there from a day view.
  const [addDate, setAddDate] = useState(null)
  const [tokensOpen, setTokensOpen] = useState(false)
  const isDesktop = useIsDesktop()

  const showToast = (msg) => {
    setToast(null)
    setTimeout(() => setToast(msg), 10)
  }

  /** `date` is `YYYY-MM-DD`; omitted means today. */
  const goToAdd = (date = null) => {
    setAddDate(date)
    setScreen(2)
  }

  const navigate = (next) => {
    if (next === 2) setAddDate(null)
    setScreen(next)
  }

  const handleAdd = async (data) => {
    try {
      await add(data)
    } catch (e) {
      // Surface the reason (e.g. a rejected date) instead of failing silently,
      // then rethrow so AddExpense keeps the form filled for a retry.
      showToast(e.message)
      throw e
    }
    const when = data.date && data.date !== todayInput() ? ` · ${dayLabel(data.date)}` : ''
    showToast(`+ ${fmtShort(data.amount)} ₽ added${when}`)
    setAddDate(null)
    setScreen(0)
  }

  const handleUpdate = async (id, data) => {
    try {
      await update(id, data)
    } catch (e) {
      showToast(e.message)
      throw e
    }
    showToast('expense updated')
    setEditingExpense(null)
  }

  const handleDelete = async (id) => {
    await remove(id)
    showToast('expense deleted')
    // Экран редактирования мог быть открыт на этой же трате — закрываем,
    // иначе он останется висеть над списком, где её уже нет.
    setEditingExpense(cur => (cur && cur.id === id ? null : cur))
    // EditExpense различает успех и отказ по возвращённому значению, а не по
    // брошенному исключению. Без явного true его ветка успеха недостижима,
    // и подтверждающая вибрация после удаления не срабатывает.
    return true
  }

  // The two shells share every handler above and every screen below; they differ
  // only in chrome and in how much width each screen is handed.
  const screens = (
    <>
      {screen === 0 && (
        <Dashboard
          transactions={transactions}
          onEdit={setEditingExpense}
          onRefresh={refresh}
          desktop={isDesktop}
        />
      )}
      {screen === 1 && (
        <History
          transactions={transactions}
          loading={loading}
          onDelete={handleDelete}
          onEdit={setEditingExpense}
          onRefresh={refresh}
          desktop={isDesktop}
        />
      )}
      {screen === 2 && (
        <AddExpense
          key={addDate ?? 'today'}
          onAdd={handleAdd}
          initialDate={addDate}
          desktop={isDesktop}
        />
      )}
      {screen === 3 && (
        <Stats
          onAddExpense={goToAdd}
          transactions={transactions}
          onEdit={setEditingExpense}
          desktop={isDesktop}
        />
      )}
    </>
  )

  const overlays = (
    <>
      {tokensOpen && (
        isDesktop
          ? (
            <DesktopModal onClose={() => setTokensOpen(false)} width={620}>
              <ApiTokens onClose={() => setTokensOpen(false)} />
            </DesktopModal>
          )
          : <ApiTokens onClose={() => setTokensOpen(false)} />
      )}

      {editingExpense && (
        <EditExpense
          expense={editingExpense}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onCancel={() => setEditingExpense(null)}
          desktop={isDesktop}
        />
      )}
    </>
  )

  if (isDesktop) {
    return (
      <div className="fixed inset-0 flex overflow-hidden" style={{ background: 'var(--bg-base)' }}>
        <Sidebar screen={screen} onNavigate={navigate} onOpenTokens={() => setTokensOpen(true)} />

        <main className="flex-1 min-w-0 flex flex-col relative overflow-hidden">
          <OfflineBanner message={error} onRetry={refresh} desktop />
          {loading && screen === 0 ? (
            <DesktopSkeleton />
          ) : (
            <div key={screen} className="flex-1 flex flex-col min-h-0 animate-fade-in">
              {screens}
            </div>
          )}
        </main>

        {overlays}
        {toast && <Toast message={toast} onClose={() => setToast(null)} desktop />}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex justify-center overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div
        className="w-full h-full max-w-sm flex flex-col relative overflow-hidden"
        style={{
          background: 'var(--bg-base)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <OfflineBanner message={error} onRetry={refresh} />
          {loading && screen === 0 ? (
            <SkeletonLoader />
          ) : (
            <div key={screen} className="flex-1 flex flex-col min-h-0 animate-fade-in">
              {screens}
            </div>
          )}
        </div>
        <BottomNav screen={screen} onNavigate={navigate} onOpenTokens={() => setTokensOpen(true)} />

        {overlays}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}


function SkeletonLoader() {
  return (
    <div className="flex-1 px-6 pt-8 animate-fade-in">
      <div className="skeleton h-3 w-20 mb-6" />
      <div className="skeleton h-4 w-32 mb-8" />
      <div className="skeleton h-10 w-48 mb-3" />
      <div className="skeleton h-3 w-24 mb-8" />
      <div style={{ borderTop: '1px solid var(--border-muted)' }} className="pt-5">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="skeleton h-3 w-12 mb-3" />
            <div className="skeleton h-6 w-20" />
          </div>
          <div className="flex-1">
            <div className="skeleton h-3 w-12 mb-3" />
            <div className="skeleton h-6 w-20" />
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--border-muted)' }} className="mt-5 pt-5">
        <div className="skeleton h-3 w-16 mb-4" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex justify-between items-center py-3">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Mirrors the desktop dashboard grid so the first paint has the right shape. */
function DesktopSkeleton() {
  return (
    <div className="flex-1 overflow-hidden px-10 pt-8 animate-fade-in">
      <div className="skeleton h-3 w-28 mb-8" />
      <div className="grid grid-cols-3 gap-5 mb-5">
        <div className="col-span-2 skeleton" style={{ height: 240, borderRadius: 'var(--radius-lg)' }} />
        <div className="flex flex-col gap-5">
          <div className="skeleton flex-1" style={{ borderRadius: 'var(--radius-md)' }} />
          <div className="skeleton flex-1" style={{ borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 skeleton" style={{ height: 280, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 'var(--radius-lg)' }} />
      </div>
    </div>
  )
}
