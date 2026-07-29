import { useState } from 'react'
import { useTransactions } from './hooks/useTransactions'
import Dashboard from './components/Dashboard'
import History from './components/History'
import AddExpense from './components/AddExpense'
import EditExpense from './components/EditExpense'
import Stats from './components/Stats'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import { fmtShort } from './utils/format'
import { dayLabel, todayInput } from './utils/date'

export default function App() {
  const [screen, setScreen] = useState(0)
  const { transactions, loading, add, update, remove, refresh } = useTransactions()
  const [toast, setToast] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  // Pre-selected day for the add screen, set when you jump there from a day view.
  const [addDate, setAddDate] = useState(null)

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
          {loading && screen === 0 ? (
            <SkeletonLoader />
          ) : (
            <div key={screen} className="flex-1 flex flex-col min-h-0 animate-fade-in">
              {screen === 0 && <Dashboard transactions={transactions} onEdit={setEditingExpense} onRefresh={refresh} />}
              {screen === 1 && <History transactions={transactions} loading={loading} onDelete={handleDelete} onEdit={setEditingExpense} onRefresh={refresh} />}
              {screen === 2 && <AddExpense key={addDate ?? 'today'} onAdd={handleAdd} initialDate={addDate} />}
              {screen === 3 && <Stats onAddExpense={goToAdd} transactions={transactions} onEdit={setEditingExpense} />}
            </div>
          )}
        </div>
        <BottomNav screen={screen} onNavigate={navigate} />
        
        {editingExpense && (
          <EditExpense 
            expense={editingExpense} 
            onUpdate={handleUpdate} 
            onCancel={() => setEditingExpense(null)} 
          />
        )}
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
