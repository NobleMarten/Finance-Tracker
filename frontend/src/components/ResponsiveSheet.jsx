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

  // The calendar portals to <body>, i.e. "outside" this modal: clicks and
  // Escape there belong to the calendar, not to us.
  const inPicker = (e) => Boolean(
    document.querySelector('[data-overlay="datepicker"]') ||
    e?.target?.closest?.('[data-overlay="datepicker"]'),
  )
  const guardOutside = (e) => { if (!dismissible || inPicker(e)) e.preventDefault() }
  const guardEscape = (e) => { if (!dismissible || inPicker(e)) e.preventDefault() }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(className, dialogClassName)}
          onInteractOutside={guardOutside}
          onEscapeKeyDown={guardEscape}
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
      <DrawerContent className={cn(className, sheetClassName)} onInteractOutside={guardOutside} onEscapeKeyDown={guardEscape}>
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <DrawerDescription className="sr-only">{description ?? title}</DrawerDescription>
        {children}
      </DrawerContent>
    </Drawer>
  )
}
