/** @category interactive */
import type { Tabs as BaseTabs } from '@base-ui/react/tabs'

/**
 * Tabs root component props contract.
 * All template implementations must satisfy this interface.
 */
export type TabsProps = BaseTabs.Root.Props

/**
 * Tabs list (tab bar container) props contract.
 */
export type TabsListProps = BaseTabs.List.Props

/**
 * Individual tab trigger props contract. Requires a `value` that matches a TabsContent.
 */
export type TabsTriggerProps = BaseTabs.Tab.Props

/**
 * Tabs content panel props contract. Requires a `value` matching its TabsTrigger.
 */
export type TabsContentProps = BaseTabs.Panel.Props
