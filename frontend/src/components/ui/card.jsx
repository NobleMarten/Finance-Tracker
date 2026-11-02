import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Card = forwardRef(function Card({ className, ...props }, ref) {
  return <div ref={ref} className={cn('rounded-2xl bg-card text-card-foreground shadow-soft', className)} {...props} />
})

export const CardHeader = forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex items-center justify-between gap-3 px-5 pt-5 pb-3', className)} {...props} />
})

export const CardTitle = forwardRef(function CardTitle({ className, ...props }, ref) {
  return <h3 ref={ref} className={cn('text-[15px] font-semibold tracking-tight text-foreground', className)} {...props} />
})

export const CardContent = forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn('px-5 pb-5', className)} {...props} />
})
