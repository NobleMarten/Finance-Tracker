/**
 * Frame for login / register / reset: navy band with the brand on top, a white
 * card holding the form. On the phone the card is a sheet tucked under the band
 * (like the home screen); on desktop it floats centred over the band.
 */
export default function AuthShell({ children }) {
  return (
    <div className="flex flex-col bg-background lg:items-center" style={{ minHeight: 'var(--app-h, 100dvh)' }}>
      <div
        className="on-navy px-6 pb-16 text-white lg:absolute lg:inset-x-0 lg:top-0 lg:h-[46vh] lg:pb-0"
        style={{ background: 'var(--navy-gradient)', paddingTop: 'calc(env(safe-area-inset-top) + 40px)' }}
      >
        <div className="mx-auto flex max-w-[420px] items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[18px] font-bold">₽</span>
          <div>
            <div className="text-[17px] font-bold tracking-tight">Finance</div>
            <div className="text-[12px] font-medium text-white/55">Учёт расходов</div>
          </div>
        </div>
      </div>
      <div className="relative -mt-8 flex-1 rounded-t-[28px] bg-card lg:flex-none px-6 pb-10 pt-8 lg:mt-[16vh] lg:w-full lg:max-w-[420px] lg:rounded-3xl lg:p-9 lg:shadow-pop">
        <div className="mx-auto max-w-[420px]">{children}</div>
      </div>
    </div>
  )
}
