import { cn } from '@/lib/utils'

/** Icon tile + bold title — the one section-header shape used across screens. */
export function SectionTitle({ icon: Icon, title, meta, size = 32, className }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {Icon && (
        <span
          className="flex flex-shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary"
          style={{ width: size, height: size }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.1} />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="truncate text-[15px] font-bold tracking-tight text-foreground">{title}</h2>
        {meta && <div className="truncate text-[12px] font-medium text-muted-foreground">{meta}</div>}
      </div>
    </div>
  )
}

/**
 * White card for a screen section: header (icon tile, title, optional meta under
 * it, optional action on the right) and the body below.
 */
export default function SectionCard({ icon, title, meta, action, children, className, bodyClassName }) {
  return (
    <section className={cn('rounded-2xl bg-card shadow-soft', className)}>
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
        <SectionTitle icon={icon} title={title} meta={meta} />
        {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
      </div>
      <div className={cn('px-4 pb-4', bodyClassName)}>{children}</div>
    </section>
  )
}
