/** @category typography */
import type * as React from 'react'

/**
 * Heading size options.
 */
export type HeadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'

/**
 * Heading level options (maps to h1-h6).
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Heading component props contract.
 * Renders semantic h1-h6 elements with consistent typography.
 * All template implementations must satisfy this interface.
 */
export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Semantic heading level (renders h1-h6)
   * @default 2
   */
  level?: HeadingLevel
  /** Visual size override (decouple semantics from appearance) */
  size?: HeadingSize
}
