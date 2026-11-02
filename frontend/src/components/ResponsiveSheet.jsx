import { useIsDesktop } from '@/hooks/useMediaQuery'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

/**
 * One form container, two shapes: a bottom sheet on the phone, a centred
 * Dialog on desktop. Always mounted while `open`; closing goes through
 * onOpenChange(false) so the caller owns the state.
 */
export default function ResponsiveSheet({
  open, onOpenChange, title, description, children, className, dialogClassName, sheetClassName,
  dismissible = true,
}) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(className, dialogClassName)}
          onInteractOutside={(e) => { if (!dismissible) e.preventDefault() }}
          onEscapeKeyDown={(e) => {
            if (!dismissible || document.querySelector('[data-overlay="datepicker"]')) e.preventDefault()
          }}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{description ?? title}</DialogDescription>
          {children}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={dismissible} repositionInputs={false}>
      <DrawerContent className={cn(className, sheetClassName)}>
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <DrawerDescription className="sr-only">{description ?? title}</DrawerDescription>
        {children}
      </DrawerContent>
    </Drawer>
  )
}
