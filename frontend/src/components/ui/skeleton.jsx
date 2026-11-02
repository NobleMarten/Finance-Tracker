import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton rounded-xl', className)} {...props} />
}
