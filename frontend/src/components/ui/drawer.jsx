import { forwardRef } from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'

export function Drawer({ shouldScaleBackground = false, ...props }) {
  return <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
}

export const DrawerPortal = DrawerPrimitive.Portal
export const DrawerClose = DrawerPrimitive.Close

export const DrawerOverlay = forwardRef(function DrawerOverlay({ className, ...props }, ref) {
  return <DrawerPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-primary-deep/40', className)} {...props} />
})

export const DrawerContent = forwardRef(function DrawerContent({ className, children, ...props }, ref) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-[28px] bg-background outline-none',
          className,
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        {...props}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 flex-shrink-0 rounded-full bg-foreground/15" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
})

export const DrawerTitle = forwardRef(function DrawerTitle({ className, ...props }, ref) {
  return <DrawerPrimitive.Title ref={ref} className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
})

export const DrawerDescription = forwardRef(function DrawerDescription({ className, ...props }, ref) {
  return <DrawerPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
})
