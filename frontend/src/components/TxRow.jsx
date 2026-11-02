import { avatarColor } from '../utils/avatar'
import { fmtRub, fmtTime, titleOf } from '../utils/format'
import { cn } from '@/lib/utils'

/** One expense row: 40px letter tile · title + meta · amount. */
export default function TxRow({ t, onClick, meta, delay = 0 }) {
  const c = avatarColor(t.description)
  const letter = t.description?.trim() ? t.description.trim()[0].toUpperCase() : '—'
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-150 animate-fade-in hover:bg-muted/70 active:bg-muted"
      style={{ animationDelay: `${delay}s` }}
    >
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-[14px] font-bold"
        style={{ background: c.bg, color: c.fg }}
      >
        {letter}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-[14px] font-semibold', !t.description?.trim() && 'text-muted-foreground')}>
          {titleOf(t)}
        </span>
        <span className="text-[12px] font-medium text-muted-foreground">{meta ?? fmtTime(t.ts)}</span>
      </span>
      <span className="whitespace-nowrap pl-2 text-[15px] font-semibold tabular-nums tracking-tight">{fmtRub(t.amount)}</span>
    </button>
  )
}
