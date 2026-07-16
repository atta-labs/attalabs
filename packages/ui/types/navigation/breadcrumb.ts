/** @category navigation */
import type * as React from 'react'

/**
 * Breadcrumb component props contract — the outer `<nav>` wrapper.
 */
export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<'nav'> {
  /** Custom separator node between items (defaults to a chevron). */
  separator?: React.ReactNode
}

/** Breadcrumb ordered-list props contract. */
export type BreadcrumbListProps = React.ComponentPropsWithoutRef<'ol'>

/** Breadcrumb list-item props contract. */
export type BreadcrumbItemProps = React.ComponentPropsWithoutRef<'li'>

/**
 * Breadcrumb link props contract.
 */
export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<'a'> {
  /** Render as the single child element instead of an `<a>` (Radix Slot). */
  asChild?: boolean
}

/** Breadcrumb current-page (non-link) props contract. */
export type BreadcrumbPageProps = React.ComponentPropsWithoutRef<'span'>

/** Breadcrumb separator props contract. */
export type BreadcrumbSeparatorProps = React.ComponentProps<'li'>

/** Breadcrumb overflow-ellipsis props contract. */
export type BreadcrumbEllipsisProps = React.ComponentProps<'span'>
