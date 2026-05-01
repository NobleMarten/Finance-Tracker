import { useState, useRef, useCallback } from 'react'
import { useTransactions } from './hooks/useTransactions'
import Dashboard from './components/Dashboard'
import History from './components/History'
import AddExpense from './components/AddExpense'
import EditExpense from './components/EditExpense'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import { fmtShort } from './utils/format'

export default function App() {
  const [screen, setScreen] = useState(0)
  const { transactions, loading, add, update, remove } = useTransactions()
  const [toast, setToast] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)

  const showToast = (msg) => {
    setToast(null)
    setTimeout(() => setToast(msg), 10)
  }

  const handleAdd = async (data) => {
    await add(data)
    showToast(`+ ${fmtShort(data.amount)} ₽ added`)
    setScreen(0)
  }

  const handleUpdate = async (id, data) => {
    await update(id, data)
    showToast('expense updated')
    setEditingExpense(null)
  }

  const handleDelete = async (id) => {
    await remove(id)
    showToast('expense deleted')
  }

  return (
    <div className="fixed inset-0 bg-[#0b0b0b] flex justify-center overflow-hidden">
      <div 
        className="w-full h-full max-w-sm flex flex-col bg-[#0b0b0b] relative overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <SwipeableScreens screen={screen} setScreen={setScreen} loading={loading}>
          {loading && screen === 0 ? (
            <SkeletonLoader />
          ) : (
            <div key={screen} className="flex-1 flex flex-col min-h-0 animate-fade-in">
              {screen === 0 && <Dashboard transactions={transactions} onEdit={setEditingExpense} />}
              {screen === 1 && <History transactions={transactions} onDelete={handleDelete} onEdit={setEditingExpense} />}
              {screen === 2 && <AddExpense onAdd={handleAdd} />}
            </div>
          )}
        </SwipeableScreens>
        <BottomNav screen={screen} onNavigate={setScreen} />
        
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

function SwipeableScreens({ screen, setScreen, loading, children }) {
  const touchStart = useRef({ x: 0, y: 0 })
  const swiping = useRef(false)
  const locked = useRef(false) // locked to vertical scroll, ignore swipe

  const onTouchStart = useCallback((e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    swiping.current = false
    locked.current = false
  }, [])

  const onTouchMove = useCallback((e) => {
    if (locked.current) return
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = e.touches[0].clientY - touchStart.current.y
    // Determine intent after 10px of movement
    if (!swiping.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical scroll — don't intercept
        locked.current = true
        return
      }
      swiping.current = true
    }
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (locked.current || !swiping.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const THRESHOLD = 60
    if (dx < -THRESHOLD && screen === 0) {
      setScreen(1) // swipe left → History
    } else if (dx > THRESHOLD && screen === 1) {
      setScreen(0) // swipe right → Dashboard
    }
  }, [screen, setScreen])

  // Only enable swipe on Dashboard and History screens
  const swipeable = screen === 0 || screen === 1

  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      onTouchStart={swipeable ? onTouchStart : undefined}
      onTouchMove={swipeable ? onTouchMove : undefined}
      onTouchEnd={swipeable ? onTouchEnd : undefined}
      style={{ touchAction: 'pan-y' }}
    >
      {children}
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
