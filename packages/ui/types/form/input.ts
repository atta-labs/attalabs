/** @category form */
import type * as React from 'react'

/**
 * Input variant options available across all templates.
 */
export type InputVariant = 'default' | 'filled' | 'ghost' | 'error'

/**
 * Input size options available across all templates.
 */
export type InputSize = 'sm' | 'default' | 'lg'

/**
 * Base Input component props contract.
 * The raw input element wrapper.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * InputBlock component props contract.
 * Wrapper that provides styling and sections around the input.
 */
export interface InputBlockProps {
  /** Visual style variant */
  variant?: InputVariant
  /** Size of the input */
  size?: InputSize
  /** Additional CSS classes */
  className?: string
  /** Content to display on the left side of the input */
  leftSection?: React.ReactNode
  /** Content to display on the right side of the input */
  rightSection?: React.ReactNode
  /** Whether the input has an error */
  error?: boolean
  /** Children (typically the Input component) */
  children: React.ReactNode
}
