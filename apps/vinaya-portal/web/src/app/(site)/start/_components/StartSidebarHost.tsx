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
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { StartSidebar, StartSidebarNav } from './StartSidebar'

/** `/docs`' `DocSidebarHost` shape exactly, over this section's own nav. */
export function StartSidebarHost() {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <StartSidebar pathname={pathname} />

      <div className='relative z-10 shrink-0 lg:hidden'>
        <ChromeFrame variant='bar' className='h-11 items-center gap-3 px-4'>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant='outline' size='icon' aria-label='Open start navigation'>
                <Menu className='size-4' />
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='bg-sidebar text-sidebar-foreground p-0'>
              <SheetTitle className='sr-only'>Start navigation</SheetTitle>
              <SidebarProvider className='h-full min-h-0 w-full'>
                <StartSidebarNav pathname={pathname} />
              </SidebarProvider>
            </SheetContent>
          </Sheet>

          <Text as='span' className='font-sans text-sm font-bold uppercase tracking-widest text-foreground'>
            Start
          </Text>
        </ChromeFrame>
      </div>
    </>
  )
}
