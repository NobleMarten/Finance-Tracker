import { fmtShort } from '../utils/format'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

/** «10501.5» → «10 501,5» while typing; the stored value is rounded on save anyway. */
function displayAmount(amt) {
  const [int, frac] = amt.split('.')
  const head = fmtShort(Number(int || 0))
  return frac !== undefined ? `${head},${frac}` : head
}

/**
 * Shared body of the add / edit forms. All state and side effects stay in the
 * caller — this only lays the pieces out the same way in the sheet and the dialog.
 */
export default function ExpenseForm({
  title, headerExtra, amt, desc, onDesc, dateChip, numpad, hiddenInput,
  ready, busy, onSubmit, submitLabel, desktop = false,
}) {
  const empty = amt === '0'
  const text = displayAmount(amt)
  const size = text.length > 11 ? 30 : text.length > 8 ? 36 : 44

  return (
    <div className={cn('flex flex-col px-5 pb-5', desktop ? 'pt-6' : 'pt-3')}>
      {hiddenInput}
      <div className={cn('flex min-h-8 items-center justify-between gap-3', desktop && 'pr-10')}>
        <h2 className="text-[18px] font-bold tracking-tight">{title}</h2>
        {headerExtra}
      </div>

      <div className="mt-4 text-center">
        <div className="text-[12px] font-semibold text-muted-foreground">Сумма</div>
        <div
          className={cn('mt-1 whitespace-nowrap font-semibold leading-tight tracking-[-0.03em] tabular-nums transition-colors', empty ? 'text-foreground/25' : 'text-foreground')}
          style={{ fontSize: size }}
        >
          {text}<span className="ml-1.5 text-foreground/30">₽</span>
        </div>
      </div>

      <input
        value={desc}
        onChange={e => onDesc(e.target.value)}
        placeholder="На что? (необязательно)"
        aria-label="Описание"
        className="mt-4 h-12 w-full rounded-xl bg-card px-4 text-[15px] font-medium shadow-soft outline-none ring-1 ring-black/[0.03] placeholder:font-normal placeholder:text-foreground/35 focus:ring-2 focus:ring-primary/25"
      />

      {dateChip}

      <div className="mt-4">{numpad}</div>

      <Button
        type="button"
        size="lg"
        onClick={onSubmit}
        disabled={!ready || busy}
        className="mt-4 h-[52px] w-full rounded-2xl text-[15px]"
      >
        {busy ? <span className="animate-spin-btn" /> : submitLabel}
      </Button>
      {desktop && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Цифры можно вводить с клавиатуры · Enter — сохранить · Backspace — стереть
        </p>
      )}
    </div>
  )
}
