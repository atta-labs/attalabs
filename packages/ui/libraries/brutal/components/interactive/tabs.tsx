'use client'

import type * as React from 'react'
import {
  Tabs,
  TabsContent,
  TabsList as InstalledTabsList,
  TabsTrigger as InstalledTabsTrigger
} from '../../installed/tabs'
import { cn } from '../../../../lib/utils'

// Full-width hard-bordered container, no radius, no padding, no gap between tabs
function TabsList({ className, ...props }: React.ComponentProps<typeof InstalledTabsList>) {
  return <InstalledTabsList className={cn('flex w-full h-auto rounded-none p-0 gap-0', className)} {...props} />
}

// Equal-width tabs, no radius, ultra-bold, uppercase — active pops with 4px hard shadow
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof InstalledTabsTrigger>) {
  return (
    <InstalledTabsTrigger
      className={cn(
        'flex-1 rounded-none font-black uppercase tracking-wide px-6 py-3',
        'hover:bg-muted/30',
        'data-[state=active]:shadow-[4px_4px_0px_0px_var(--border)]',
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
