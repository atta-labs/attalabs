/** @category form */
import type * as React from 'react'

/**
 * Checkbox checked state type.
 */
export type CheckedState = boolean | 'indeterminate'

/**
 * Checkbox component props contract.
 */
export interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'checked' | 'defaultChecked'> {
  checked?: CheckedState
  defaultChecked?: CheckedState
  required?: boolean
  onCheckedChange?: (checked: CheckedState) => void
  className?: string
}
