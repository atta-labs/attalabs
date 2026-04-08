/** @category layout */
import type * as React from 'react'

/**
 * Separator orientation options.
 */
export type SeparatorOrientation = 'horizontal' | 'vertical'

/**
 * Separator component props contract.
 */
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Orientation of the separator
   * @default 'horizontal'
   */
  orientation?: SeparatorOrientation
  /** Whether the separator is purely decorative (for accessibility) */
  decorative?: boolean
  /** Additional CSS classes */
  className?: string
}
