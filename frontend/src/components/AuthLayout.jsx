import UserMenu from './UserMenu'

export default function AuthLayout({ children }) {
  return (
    <>
      <div
        className="pointer-events-none fixed right-0 top-0 z-[200] p-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pr-[calc(0.75rem+env(safe-area-inset-right,0px))]"
      >
        <div className="pointer-events-auto flex justify-end">
          <UserMenu />
        </div>
      </div>
      {children}
    </>
  )
}
