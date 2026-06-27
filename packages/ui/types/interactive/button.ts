/** @category interactive */
import type * as React from 'react'

/**
 * Button variant options available across all templates.
 * Each template must support all these variants.
 */
export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'ghost-pill'
  | 'link'
  | 'square'
  | 'ai'

/**
 * Button size options available across all templates.
 */
export type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'

/**
 * Button component props contract.
 * All template implementations (radix, retro, animated) must satisfy this interface.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant
   * @default 'default'
   */
  variant?: ButtonVariant
  /** Size of the button
   * @default 'default'
   */
  size?: ButtonSize
  /** Show loading spinner and disable button */
  loading?: boolean
  /** Icon to display before children */
  iconLeft?: React.ReactNode
  /** Icon to display after children */
  iconRight?: React.ReactNode
  /** Render as a different element using Radix Slot */
  asChild?: boolean
}

/**
 * buttonVariants function contract.
 * Returns className string based on variant and size.
 */
export type ButtonVariantsFn = (options?: { variant?: ButtonVariant; size?: ButtonSize; className?: string }) => string
