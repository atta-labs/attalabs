/** @category form */
import type * as React from 'react'

/**
 * Textarea variant options available across all templates.
 */
export type TextareaVariant = 'default' | 'filled' | 'ghost' | 'error' | 'underlined' | 'neubrutalism' | 'bare'

/**
 * Textarea size options available across all templates.
 */
export type TextareaSize = 'sm' | 'default' | 'lg'

/**
 * Textarea component props contract.
 * All template implementations must satisfy this interface.
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Visual style variant */
  variant?: TextareaVariant
  /** Size of the textarea */
  size?: TextareaSize
  /** Whether the textarea has an error */
  error?: boolean
  /** className applied to the inner <textarea> element (wrapper gets className) */
  textareaClassName?: string
}
