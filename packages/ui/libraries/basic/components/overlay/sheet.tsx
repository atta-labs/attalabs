import type { ComponentProps } from 'react'
import {
  Sheet,
  SheetClose as InstalledSheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger as InstalledSheetTrigger
} from '../../installed/sheet'
import { resolveSingleChild } from '../as-child'

// asChild → render adapters for basic's Base UI Sheet (built on @base-ui/react
// Dialog). See ../as-child. installed/sheet.tsx stays a verbatim Base UI paste;
// only the two composition points apps use with `asChild`
// (SheetTrigger, SheetClose) are wrapped. Everything else is a plain re-export.
function SheetTrigger({
  asChild,
  children,
  render,
  ...props
}: ComponentProps<typeof InstalledSheetTrigger> & { asChild?: boolean }) {
  const resolvedRender = render ?? (asChild ? resolveSingleChild(children) : undefined)
  return (
    <InstalledSheetTrigger render={resolvedRender} {...props}>
      {resolvedRender ? undefined : children}
    </InstalledSheetTrigger>
  )
}

function SheetClose({
  asChild,
  children,
  render,
  ...props
}: ComponentProps<typeof InstalledSheetClose> & { asChild?: boolean }) {
  const resolvedRender = render ?? (asChild ? resolveSingleChild(children) : undefined)
  return (
    <InstalledSheetClose render={resolvedRender} {...props}>
      {resolvedRender ? undefined : children}
    </InstalledSheetClose>
  )
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger }
