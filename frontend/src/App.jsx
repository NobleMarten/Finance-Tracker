import { useRef, useState } from 'react'
import { useTransactions } from './hooks/useTransactions'
import { useIsDesktop } from './hooks/useMediaQuery'
import Dashboard from './components/Dashboard'
import History from './components/History'
import AddExpense from './components/AddExpense'
import EditExpense from './components/EditExpense'
import Stats from './components/Stats'
import BottomNav from './components/BottomNav'
import TopNav from './components/TopNav'
import ProfileSheet from './components/ProfileSheet'
import ResponsiveSheet from './components/ResponsiveSheet'
import Toast from './components/Toast'
import OfflineBanner from './components/OfflineBanner'
import ApiTokens from './components/ApiTokens'
import { fmtRub } from './utils/format'
import { Skeleton } from './components/ui/skeleton'
import { dayLabel, todayInput } from './utils/date'

export default function App() {
  const [screen, setScreen] = useState(0)
  const { transactions, loading, error, add, update, remove, refresh } = useTransactions()
  const [toast, setToast] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  // The add form is a sheet over whatever screen you are on, so a successful
  // add leaves you exactly where you started (e.g. on History's day view).
  const [addOpen, setAddOpen] = useState(false)
  // Pre-selected day for the add form, set when you open it from a day view.
  const [addDate, setAddDate] = useState(null)
  // { amount, description } to start the form from — set by «Повторить».
  const [addPrefill, setAddPrefill] = useState(null)
  // Bumped on every open so the form starts clean each time.
  const [addKey, setAddKey] = useState(0)
  // The edit sheet animates out after editingExpense is cleared; keep the last
  // expense around so its body has something to render during the exit.
  const lastEdited = useRef(null)
  if (editingExpense) lastEdited.current = editingExpense
  // Lifted out of History so the selected period survives screen switches
  // (History unmounts while another screen is shown).
  const [historyView, setHistoryView] = useState({ seg: 0, offset: 0 })
  const [tokensOpen, setTokensOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const isDesktop = useIsDesktop()

  const showToast = (msg) => {
    setToast(null)
    setTimeout(() => setToast(msg), 10)
  }

  /** `date` is `YYYY-MM-DD`; omitted means today. `prefill` is { amount, description }. */
  const openAdd = (date = null, prefill = null) => {
    // Guards: callers wired straight to onClick would hand us the click event.
    setAddDate(typeof date === 'string' ? date : null)
    setAddPrefill(prefill && typeof prefill.amount === 'number' ? prefill : null)
    setAddKey(k => k + 1)
    setAddOpen(true)
  }

  const navigate = (next) => {
    if (next === 2) { openAdd(); return }
    setScreen(next)
  }

  // Let the profile sheet finish closing before the tokens sheet slides up.
  const openTokens = () => setTimeout(() => setTokensOpen(true), 220)

  const handleAdd = async (data) => {
    try {
      await add(data)
    } catch (e) {
      // Surface the reason (e.g. a rejected date) instead of failing silently,
      // then rethrow so AddExpense keeps the form filled for a retry.
      showToast({ text: e.message, tone: 'error' })
      throw e
    }
    const when = data.date && data.date !== todayInput() ? ` · ${dayLabel(data.date)}` : ''
    showToast(`+${fmtRub(data.amount)} добавлено${when}`)
    setAddOpen(false)
  }

  const handleUpdate = async (id, data) => {
    try {
      await update(id, data)
    } catch (e) {
      showToast({ text: e.message, tone: 'error' })
      throw e
    }
    showToast('Трата изменена')
    setEditingExpense(null)
  }

  const handleDelete = async (id) => {
    await remove(id)
    showToast('Трата удалена')
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
          onNavigate={navigate}
          onAdd={openAdd}
          onOpenProfile={() => setProfileOpen(true)}
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
          onAddExpense={(date) => openAdd(date)}
          view={historyView}
          onViewChange={setHistoryView}
          desktop={isDesktop}
        />
      )}
      {screen === 3 && (
        <Stats
          onAddExpense={openAdd}
          transactions={transactions}
          onEdit={setEditingExpense}
          desktop={isDesktop}
        />
      )}
    </>
  )

  const overlays = (
    <>
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onOpenTokens={openTokens}
      />
      <ResponsiveSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Новый расход"
        dialogClassName="max-w-[420px]"
      >
        <AddExpense
          key={addKey}
          onAdd={handleAdd}
          initialDate={addDate}
          initialAmount={addPrefill?.amount}
          initialDesc={addPrefill?.description}
          desktop={isDesktop}
        />
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(editingExpense)}
        onOpenChange={(o) => { if (!o) setEditingExpense(null) }}
        title="Изменить расход"
        dialogClassName="max-w-[420px]"
      >
        {lastEdited.current && (
          <EditExpense
            key={lastEdited.current.id}
            expense={lastEdited.current}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            desktop={isDesktop}
          />
        )}
      </ResponsiveSheet>

      <ResponsiveSheet
        open={tokensOpen}
        onOpenChange={setTokensOpen}
        title="API-токены"
        dialogClassName="max-w-[520px] h-[min(680px,86vh)]"
        sheetClassName="h-[88dvh]"
      >
        <ApiTokens />
      </ResponsiveSheet>
    </>
  )

  if (isDesktop) {
    return (
      <div className="fixed inset-0 flex flex-col overflow-y-auto bg-background">
        <TopNav
          screen={screen}
          onNavigate={navigate}
          onAdd={openAdd}
          onOpenProfile={() => setProfileOpen(true)}
        />
        <OfflineBanner message={error} onRetry={refresh} desktop />
        <main className="flex-1 min-h-0 flex flex-col">
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
    // Navy behind the top half: while a screen fades in, the top of the screen
    // stays navy (continuing the status bar) instead of flashing the light
    // page background.
    <div
      className="fixed inset-0 flex justify-center overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #18234a 0%, #18234a 45%, var(--bg-base) 45%)' }}
    >
      {/* No safe-area padding here: every scroll area pads its own bottom, so
          nothing paints the page background under the home indicator. */}
      <div className="w-full h-full max-w-md flex flex-col relative overflow-hidden">
        <div
          className="flex-1 flex flex-col min-h-0"
        >
          <OfflineBanner message={error} onRetry={refresh} />
          {loading && screen === 0 ? (
            <SkeletonLoader />
          ) : (
            <div key={screen} className="flex-1 flex flex-col min-h-0 animate-fade-in">
              {screens}
            </div>
          )}
        </div>
        <BottomNav screen={screen} onNavigate={navigate} onAdd={() => openAdd()} />

        {overlays}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="flex-1 flex flex-col animate-fade-in">
      <div className="px-5 pb-12" style={{ background: 'var(--navy-gradient)', paddingTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
        <div className="h-3 w-16 rounded-full bg-white/10" />
        <div className="mt-2 h-4 w-32 rounded-full bg-white/15" />
        <div className="mt-5 flex gap-2">
          {[76, 82, 88].map(w => <div key={w} className="h-8 rounded-full bg-white/10" style={{ width: w }} />)}
        </div>
        <div className="mt-6 h-10 w-44 rounded-xl bg-white/15" />
        <div className="mt-3 h-3 w-16 rounded-full bg-white/10" />
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => <div key={i} className="mx-auto h-14 w-14 rounded-2xl bg-white/10" />)}
        </div>
      </div>
      <div className="-mt-7 flex-1 rounded-t-[28px] bg-card px-5 pt-6">
        <Skeleton className="h-5 w-48" />
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="mt-5 flex items-center gap-3">
            <Skeleton className="h-10 w-10" />
            <div className="flex-1"><Skeleton className="h-3.5 w-28" /><Skeleton className="mt-2 h-3 w-12" /></div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Mirrors the desktop dashboard grid so the first paint has the right shape. */
function DesktopSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pt-8 animate-fade-in">
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 flex flex-col gap-5">
          <div className="h-[340px] rounded-3xl" style={{ background: 'var(--navy-gradient)', opacity: 0.9 }} />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
