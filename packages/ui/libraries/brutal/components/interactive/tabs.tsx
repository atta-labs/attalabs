'use client'

import type * as React from 'react'
import {
  Tabs,
  TabsContent as InstalledTabsContent,
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

// Cross-library "hide when inactive, stay mounted" contract (see
// .claude/skills/ui-library-system/SKILL.md "Flavor matrix" — Tabs). Same
// native-Radix mechanism as retro's wrapper (`retro/components/interactive/tabs.tsx`):
// `forceMount` only keeps an inactive panel MOUNTED, Radix's own `hidden`
// stays permanently false once it's set, and only `data-state=inactive` tells
// mounted-but-inactive apart from active — so the hide rule is baked in here
// (a no-op when `forceMount` is unset, since an inactive panel is unmounted
// at that point). Accepts Base UI's `keepMounted` name as an alias for the
// same "one prop, no per-call-site CSS" contract basic/animate already ship.
function TabsContent({
  className,
  forceMount,
  keepMounted,
  ...props
}: Omit<React.ComponentProps<typeof InstalledTabsContent>, 'forceMount'> & {
  forceMount?: boolean
  keepMounted?: boolean
}) {
  return (
    <InstalledTabsContent
      className={cn(className, 'data-[state=inactive]:hidden')}
      forceMount={(forceMount ?? keepMounted) ? true : undefined}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
