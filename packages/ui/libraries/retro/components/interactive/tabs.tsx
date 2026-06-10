'use client'

import type * as React from 'react'
import {
  Tabs as InstalledTabs,
  TabsContent,
  TabsList as InstalledTabsList,
  TabsTrigger as InstalledTabsTrigger
} from '../../installed/tabs'
import { cn } from '../../../../lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof InstalledTabs>) {
  return <InstalledTabs className={cn('gap-6', className)} {...props} />
}

// No container box — just a flat row of tabs
function TabsList({ className, ...props }: React.ComponentProps<typeof InstalledTabsList>) {
  return <InstalledTabsList className={cn('border-0 bg-transparent p-0 rounded-none gap-1', className)} {...props} />
}

// Square corners, bold, no shadow — active tab fills with primary + thick border
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof InstalledTabsTrigger>) {
  return (
    <InstalledTabsTrigger
      className={cn(
        'flex-none rounded-none font-bold border-2 border-transparent',
        'hover:bg-transparent',
        'data-[state=active]:shadow-none',
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
