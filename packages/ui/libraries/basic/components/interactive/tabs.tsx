'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from '../../../../lib/utils'
import type * as React from 'react'

function Tabs({ className, orientation = 'horizontal', ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot='tabs'
      orientation={orientation}
      className={cn('group/tabs flex gap-2', orientation === 'horizontal' ? 'flex-col' : 'flex-row', className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      className={cn(
        'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground bg-muted',
        'group-data-[orientation=horizontal]/tabs:h-8 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot='tabs-trigger'
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground',
        'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 data-[state=active]:after:opacity-100',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  forceMount,
  keepMounted,
  ...props
}: TabsPrimitive.Panel.Props & { forceMount?: boolean }) {
  return (
    <TabsPrimitive.Panel
      data-slot='tabs-content'
      className={cn('flex-1 text-sm outline-none', className)}
      keepMounted={forceMount ?? keepMounted}
      {...props}
    />
  )
}

type TabsProps = React.ComponentProps<typeof Tabs>
type TabsListProps = React.ComponentProps<typeof TabsList>
type TabsTriggerProps = React.ComponentProps<typeof TabsTrigger>
type TabsContentProps = React.ComponentProps<typeof TabsContent>

export { Tabs, TabsList, TabsTrigger, TabsContent }
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps }
