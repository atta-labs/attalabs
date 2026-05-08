/** @category form */
import type * as React from 'react'

/**
 * Input variant options available across all templates.
 */
export type InputVariant = 'default' | 'underlined' | 'filled' | 'ghost' | 'neubrutalism' | 'error'

/**
 * Input size options available across all templates.
 */
export type InputSize = 'sm' | 'default' | 'lg'

/**
 * Base Input component props contract.
 * Includes block-level props so <Input /> renders styled by default.
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual style variant */
  variant?: InputVariant
  /** Size of the input */
  size?: InputSize
  /** Whether the input has an error state */
  error?: boolean
  /** Content to display on the left side of the input */
  leftSection?: React.ReactNode
  /** Content to display on the right side of the input */
  rightSection?: React.ReactNode
}

/**
 * InputBlock component props contract.
 * Explicit wrapper when you need to compose Input inside a custom container.
 */
export interface InputBlockProps {
  /** Visual style variant */
  variant?: InputVariant
  /** Size of the input block */
  size?: InputSize
  /** Additional CSS classes */
  className?: string
  /** Content to display on the left side */
  leftSection?: React.ReactNode
  /** Content to display on the right side */
  rightSection?: React.ReactNode
  /** Whether the input has an error */
  error?: boolean
  /** Children (typically the Input primitive) */
  children: React.ReactNode
}
