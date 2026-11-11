import { ReceiptText } from 'lucide-react'
import { fmtRubSigned, fmtTime, titleOf } from '../utils/format'
import { cn } from '@/lib/utils'

/** One expense row: 40px neutral tile · title + meta · signed amount. */
export default function TxRow({ t, onClick, meta, delay = 0 }) {
  const untitled = !t.description?.trim()
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-150 animate-fade-in hover:bg-muted/70 active:bg-muted"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* One neutral tile for every row until categories exist. */}
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <ReceiptText className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-[14px] font-semibold', untitled && 'font-medium text-muted-foreground')}>
          {titleOf(t)}
        </span>
        <span className="text-[12px] font-medium tabular-nums text-muted-foreground">{meta ?? fmtTime(t.ts)}</span>
      </span>
      <span className="whitespace-nowrap pl-2 text-[15px] font-semibold tabular-nums tracking-tight">{fmtRubSigned(t.amount)}</span>
    </button>
  )
}
