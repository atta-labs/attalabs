'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from '../../../lib/utils'

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot='tabs' className={cn('flex flex-col gap-8', className)} {...props} />
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      className={cn('flex items-center gap-0 border-b border-border/20', className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot='tabs-trigger'
      className={cn(
        'h-auto cursor-pointer rounded-none border-b-2 border-transparent bg-transparent px-4 pt-0 pb-3',
        'font-mono text-[10px] tracking-widest uppercase',
        'text-foreground/40 transition-colors hover:bg-transparent hover:text-foreground/70',
        'data-[active]:border-foreground data-[active]:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
        'disabled:pointer-events-none disabled:opacity-40',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot='tabs-content' className={cn('outline-none', className)} {...props} />
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
