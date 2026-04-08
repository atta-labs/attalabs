/** @category layout */
import type * as React from 'react'

/**
 * Flex direction options.
 */
export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse'

/**
 * Flex alignment options.
 */
export type FlexAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch'

/**
 * Flex justify options.
 */
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'

/**
 * Flex wrap options.
 */
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse'

/**
 * Flex component props contract.
 */
export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Layout direction
   * @default 'row'
   */
  direction?: FlexDirection
  /** Alignment (align-items) */
  align?: FlexAlign
  /** Justification (justify-content) */
  justify?: FlexJustify
  /** Flex wrap */
  wrap?: FlexWrap
  /** Gap between items (Tailwind spacing scale) */
  gap?: number
  /** Render as different element */
  as?: 'div' | 'span'
  /** Use Radix Slot for composition */
  asChild?: boolean
}
