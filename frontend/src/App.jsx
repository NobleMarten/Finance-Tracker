import { useState } from 'react'
import { useTransactions } from './hooks/useTransactions'
import Dashboard  from './components/Dashboard'
import History    from './components/History'
import AddExpense from './components/AddExpense'
import BottomNav  from './components/BottomNav'
import Toast      from './components/Toast'
import { fmtShort } from './utils/format'

export default function App() {
  const [screen, setScreen] = useState(0)
  const { transactions, loading, add, remove } = useTransactions()
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(null)
    setTimeout(() => setToast(msg), 10)
  }

  const handleAdd = async (data) => {
    await add(data)
    showToast(`+ ${fmtShort(data.amount)} ₽ added`)
    setScreen(0)
  }

  const handleDelete = async (id) => {
    await remove(id)
    showToast('expense deleted')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
      <div className="w-full max-w-sm h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
        {loading && screen === 0 ? (
          <SkeletonLoader />
        ) : (
          <div key={screen} className="flex-1 flex flex-col min-h-0 animate-fade-in">
            {screen === 0 && <Dashboard transactions={transactions} />}
            {screen === 1 && <History transactions={transactions} onDelete={handleDelete} />}
            {screen === 2 && <AddExpense onAdd={handleAdd} />}
          </div>
        )}
        <BottomNav screen={screen} onNavigate={setScreen} />
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
        {[1,2,3,4].map(i => (
          <div key={i} className="flex justify-between items-center py-3">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
