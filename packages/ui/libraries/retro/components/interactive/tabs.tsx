'use client'

import type * as React from 'react'
import type { Tabs as BaseTabs } from '@base-ui/react/tabs'
import { Tabs as InstalledTabs } from '../../installed/tabs'

// Adapter ONLY — retroui's canonical exports a single `Tabs` object with
// dotted children (`Tabs.List`, `Tabs.Trigger`, `Tabs.Content`) via
// `Object.assign(BaseTabs.Root, { ... })`. Our component contract requires
// FLAT named exports (`TabsList`, `TabsTrigger`, `TabsContent`). This file
// flattens the dotted API to the contract shape.
//
// Type casts to Base UI primitive types (retroui IS Base UI underneath):
// retroui defines `ITabsTriggerList` / `ITabsTrigger` / `ITabsContent`
// interfaces INSIDE the installed file without exporting them, so TypeScript
// can't write the wrapper's `.d.ts` if we let inference pull in those names.
// Casting to `BaseTabs.{List,Tab,Panel}.Props` resolves the type signatures
// against publicly-exported Base UI types — and is semantically correct,
// since retroui's interfaces extend exactly those props.
const Tabs = InstalledTabs as typeof BaseTabs.Root
const TabsList = InstalledTabs.List as React.FC<BaseTabs.List.Props>
const TabsTrigger = InstalledTabs.Trigger as React.FC<BaseTabs.Tab.Props>
const TabsContent = InstalledTabs.Content as React.FC<BaseTabs.Panel.Props>

type TabsProps = React.ComponentProps<typeof Tabs>
type TabsListProps = React.ComponentProps<typeof TabsList>
type TabsTriggerProps = React.ComponentProps<typeof TabsTrigger>
type TabsContentProps = React.ComponentProps<typeof TabsContent>

export { Tabs, TabsList, TabsTrigger, TabsContent }
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps }
