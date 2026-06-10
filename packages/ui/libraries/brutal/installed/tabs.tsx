'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../../lib/utils'
import type * as React from 'react'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot='tabs' className={cn('w-full', className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      className={cn(
        'inline-flex h-12 items-center justify-center rounded-md border-2 border-border bg-background p-1 text-foreground',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot='tabs-trigger'
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md border-2 border-transparent px-2 py-1 gap-1.5 text-sm font-bold ring-offset-white transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-border data-[state=active]:shadow-[2px_2px_0px_0px_var(--border)]',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot='tabs-content'
      className={cn(
        'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
