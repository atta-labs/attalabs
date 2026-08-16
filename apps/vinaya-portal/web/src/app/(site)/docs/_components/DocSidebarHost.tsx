'use client'

import {
  Button,
  ChromeFrame,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SidebarProvider
} from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import type { DocNav } from '@attalabs/aeg-core/docs'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DocSidebar, DocSidebarNav } from './DocSidebar'

export function DocSidebarHost({ nav }: { nav: DocNav }) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  // Close the drawer once navigation lands. Driving it off `pathname` rather
  // than wrapping every item in `SheetClose` keeps `FlatDocItem` identical on
  // both surfaces — the desktop rail has no drawer to close.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <DocSidebar nav={nav} pathname={pathname} />

      {/* Mobile sidebar-toggle bar. Rendered through `ChromeFrame variant='bar'`
       * — the same canonical retro sticky as the docs breadcrumb
       * (`StickyDocHeader`) — so it reads as a floating inset card under retro
       * and a flush strip under the flush libraries, instead of a bespoke
       * `bg-sidebar` strip. The outer div owns placement/visibility; the frame
       * owns the content box. */}
      <div className='relative z-10 shrink-0 lg:hidden'>
        <ChromeFrame variant='bar' className='h-11 items-center gap-3 px-4'>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant='outline' size='icon' aria-label='Open docs navigation'>
                <Menu className='size-4' />
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='bg-sidebar text-sidebar-foreground p-0'>
              <SheetTitle className='sr-only'>Docs navigation</SheetTitle>
              {/* No `--sidebar-width` here: nothing inside reads it (the rail's
               * width lives on the rail's own root) and `SheetContent`'s
               * `w-3/4 sm:max-w-sm` is what sizes the drawer — viewport-relative,
               * so it holds on a 320px phone where a fixed 16rem would not. */}
              <SidebarProvider className='h-full min-h-0 w-full'>
                <DocSidebarNav nav={nav} pathname={pathname} />
              </SidebarProvider>
            </SheetContent>
          </Sheet>

          <Text as='span' className='font-sans text-sm font-bold uppercase tracking-widest text-foreground'>
            The Harness
          </Text>
        </ChromeFrame>
      </div>
    </>
  )
}
