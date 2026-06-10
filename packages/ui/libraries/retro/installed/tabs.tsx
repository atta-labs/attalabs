'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../../../lib/utils'
import * as React from 'react'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot='tabs' className={cn('flex flex-col gap-2', className)} {...props} />
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    data-slot='tabs-list'
    className={cn('flex flex-row gap-1 p-1 rounded border-2 border-border bg-muted/30', className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    data-slot='tabs-trigger'
    className={cn(
      'flex-1 font-semibold px-4 py-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center',
      'text-muted-foreground',
      'hover:text-foreground hover:bg-muted/50',
      'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
      'data-[state=active]:border-2 data-[state=active]:border-border',
      'data-[state=active]:shadow-[2px_2px_0px_0px_var(--border)]',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    data-slot='tabs-content'
    className={cn('mt-2 focus:outline-none', className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsContent, TabsList, TabsTrigger }
