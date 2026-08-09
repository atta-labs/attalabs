/** @category navigation */
import type * as React from 'react'

/** NavigationMenu root props contract. */
export type NavigationMenuProps = React.ComponentPropsWithoutRef<'nav'>

/** NavigationMenu list props contract. */
export type NavigationMenuListProps = React.ComponentPropsWithoutRef<'ul'>

/** NavigationMenu item props contract. */
export type NavigationMenuItemProps = React.ComponentPropsWithoutRef<'li'>

/** NavigationMenu trigger props contract. */
export type NavigationMenuTriggerProps = React.ComponentPropsWithoutRef<'button'>

/** NavigationMenu content panel props contract. */
export type NavigationMenuContentProps = React.ComponentPropsWithoutRef<'div'>

/**
 * NavigationMenu link props contract.
 */
export interface NavigationMenuLinkProps extends React.ComponentPropsWithoutRef<'a'> {
  /** Marks the link as representing the current page. */
  active?: boolean
}

/** NavigationMenu active-item indicator props contract. */
export type NavigationMenuIndicatorProps = React.ComponentPropsWithoutRef<'div'>

/** NavigationMenu viewport (content-panel host) props contract. */
export type NavigationMenuViewportProps = React.ComponentPropsWithoutRef<'div'>
