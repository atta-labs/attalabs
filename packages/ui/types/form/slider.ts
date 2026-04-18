/** @category form */

/**
 * Slider component props contract.
 *
 * Driven by an array of numeric values. Single-thumb usage passes
 * `value={[n]}` and reads back from `onValueChange({ number }[0])`.
 */
export interface SliderProps {
  /** Minimum value (inclusive). */
  min?: number
  /** Maximum value (inclusive). */
  max?: number
  /** Discrete step size. */
  step?: number
  /** Controlled value(s). Single-thumb UIs pass a 1-element array. */
  value?: number[]
  /** Uncontrolled initial value(s). */
  defaultValue?: number[]
  /** Callback fired on change (drag, click, keyboard). */
  onValueChange?: (value: number[]) => void
  /** Callback fired when the user releases the thumb. */
  onValueCommit?: (value: number[]) => void
  /** Disable interaction. */
  disabled?: boolean
  /** Orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Accessible label. */
  'aria-label'?: string
  /** Accessible labelled-by reference. */
  'aria-labelledby'?: string
  /** Additional CSS classes forwarded to the root. */
  className?: string
}
