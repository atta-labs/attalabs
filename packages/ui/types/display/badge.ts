/** @category display */
import type * as React from 'react'

/**
 * Badge variant options available across all templates.
 */
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ai' | 'ai-outline'

/**
 * Badge size options available across all templates.
 */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/**
 * Badge shape options available across all templates.
 */
export type BadgeShape = 'rounded' | 'pill' | 'square' | 'circle'

/**
 * Badge animation options available across all templates.
 */
export type BadgeAnimation = 'none' | 'pulse' | 'bounce' | 'rotate' | 'scale'

/**
 * Badge component props contract.
 * All template implementations must satisfy this interface.
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLElement> {
  /** Content of the badge */
  children: React.ReactNode
  /** Size of the badge
   * @default 'md'
   */
  size?: BadgeSize
  /** Shape of the badge
   * @default 'rounded'
   */
  shape?: BadgeShape
  /** Animation effect */
  animation?: BadgeAnimation
  /** Visual style variant
   * @default 'default'
   */
  variant?: BadgeVariant
  /** Border radius override */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Icon to display before children */
  iconLeft?: React.ReactElement
  /** Icon to display after children */
  iconRight?: React.ReactElement
  /** Notification badge count */
  badge?: string | number
  /** Show loading spinner */
  loading?: boolean
  /** Opacity value */
  opacity?: number
  /** Animation duration */
  animationDuration?: 'fast' | 'normal' | 'slow'
  /** Disable interactions */
  disabled?: boolean
  /** Active state */
  active?: boolean
  /** Dismiss callback */
  onDismiss?: (event: React.MouseEvent<HTMLButtonElement>) => void
  /** Hover callback */
  onHover?: (event: React.MouseEvent<HTMLElement>) => void
  /** Link href (makes badge a link) */
  href?: string
  /** Click handler (makes badge a button) */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}
