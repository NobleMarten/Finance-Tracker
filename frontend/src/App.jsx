import { useState } from 'react'
import { useTransactions } from './hooks/useTransactions'
import Dashboard  from './components/Dashboard'
import History    from './components/History'
import AddExpense from './components/AddExpense'
import BottomNav  from './components/BottomNav'

export default function App() {
  const [screen, setScreen] = useState(0)
  const { transactions, loading, add } = useTransactions()

  const handleAdd = async (data) => {
    await add(data)
    setScreen(0)
  }

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center">
      <div className="w-full max-w-sm h-screen flex flex-col bg-[#141414] overflow-hidden">
        {loading && screen === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[11px] text-[#1e1e1e] uppercase tracking-widest">loading</span>
          </div>
        ) : (
          <>
            {screen === 0 && <Dashboard transactions={transactions} />}
            {screen === 1 && <History transactions={transactions} />}
            {screen === 2 && <AddExpense onAdd={handleAdd} />}
          </>
        )}
        <BottomNav screen={screen} onNavigate={setScreen} />
      </div>
    </div>
  )
}
