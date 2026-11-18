import { ArrowDown, LoaderCircle } from 'lucide-react'
import { Button } from './ui/button'

/** A deliberate page request: never download the whole history on mount. */
export default function TransactionPagination({
  count, hasMore, ready, refreshing, loadingMore, error, onLoadMore,
  note = 'Более ранние траты ещё не загружены.',
  completeNote = 'История загружена полностью.',
}) {
  if (!ready) return null
  return (
    <div className="my-4 flex flex-col items-center gap-3 px-3 text-center">
      <p className="text-[12px] leading-relaxed text-muted-foreground" role="status" aria-live="polite">
        Загружено трат: {count}.{hasMore ? ` ${note}` : ` ${completeNote}`}
      </p>
      {error && <p role="alert" className="max-w-md text-[13px] text-destructive">{error}</p>}
      {hasMore && (
        <Button
          type="button"
          variant="outline"
          disabled={refreshing || loadingMore}
          onClick={onLoadMore}
          aria-busy={loadingMore}
        >
          {loadingMore ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <ArrowDown aria-hidden="true" />}
          {loadingMore ? 'Загружаем…' : error ? 'Повторить загрузку' : 'Загрузить ещё'}
        </Button>
      )}
    </div>
  )
}
