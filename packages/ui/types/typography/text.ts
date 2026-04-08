/** @category typography */
import type * as React from 'react'

/**
 * Text element options.
 */
export type TextAs = 'p' | 'span' | 'small' | 'strong' | 'em' | 'label'

/**
 * Text size options.
 */
export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Text weight options.
 */
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold'

/**
 * Text component props contract.
 * Renders semantic text elements with consistent typography.
 * All template implementations must satisfy this interface.
 */
export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /** Render as different element
   * @default 'p'
   */
  as?: TextAs
  /** Visual size
   * @default 'md'
   */
  size?: TextSize
  /** Text weight */
  weight?: TextWeight
  /** Muted/secondary style */
  muted?: boolean
}
