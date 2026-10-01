/**
 * Полоса «данные могут быть устаревшими».
 *
 * `useTransactions` держит ошибку загрузки в состоянии, но её никто не
 * показывал: список молча оставался на данных из localStorage, и отличить
 * «трат за сегодня нет» от «сеть лежит, это позавчерашний кеш» было нельзя.
 * Именно из-за этого сбой выглядел так, будто ломаются ровно два экрана —
 * статистика и добавление, единственные, у кого есть свой текст ошибки.
 */
export default function OfflineBanner({ message, onRetry, desktop = false }) {
  if (!message) return null

  return (
    <div
      className={`flex items-center gap-3 flex-shrink-0 animate-fade-in ${
        desktop ? 'mx-10 mt-4 px-4 py-2.5' : 'mx-4 mt-3 px-3 py-2'
      }`}
      role="status"
      style={{
        background: 'var(--warning-soft)',
        border: '1px solid var(--warning-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--warning)"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        className="flex-shrink-0"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium" style={{ color: 'var(--warning)' }}>
          {message}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          Показаны сохранённые данные — они могут быть устаревшими.
        </div>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="text-[11px] uppercase tracking-[0.12em] font-medium px-2.5 py-1.5 flex-shrink-0 transition-colors active:scale-95"
          style={{
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--warning-border)',
            color: 'var(--warning)',
          }}
        >
          Ещё раз
        </button>
      )}
    </div>
  )
}
