'use client'

import { Textarea as TextareaPrimitive } from '../../installed/textarea'
import { cn } from '../../../../lib/utils'
import type { TextareaProps } from '../../../../types'

const sizeClass: Record<string, string> = {
  sm: 'min-h-[4rem]',
  default: 'min-h-16',
  lg: 'min-h-[8rem]'
}

// retro's own `installed/textarea.tsx` bakes `border-2 rounded bg-input shadow-sm` and an
// `outline`-based focus style (not `ring`-based like basic) unconditionally — variants below
// override/neutralize those with retro's own idiom rather than reusing basic's ring-* classes,
// which wouldn't cancel retro's outline-visible focus style.
const variantClass: Record<string, string> = {
  default: '',
  underlined: 'rounded-none border-0 border-b-2 px-0 shadow-none focus-visible:outline-none focus-visible:border-b-4',
  filled: 'bg-muted/50 focus-visible:bg-muted/60',
  ghost: 'border-transparent bg-transparent shadow-none focus-visible:outline-none',
  neubrutalism: '',
  // Bare: zero chrome — for nesting inside a styled container (e.g. SmartPromptInput's InputGroup).
  bare: 'min-h-0 border-0 rounded-none bg-transparent shadow-none focus-visible:outline-none resize-none',
  error: ''
}

function Textarea({
  className,
  variant = 'default',
  size = 'default',
  error,
  textareaClassName: _textareaClassName,
  ...props
}: TextareaProps) {
  return (
    <TextareaPrimitive
      aria-invalid={error || undefined}
      className={cn(sizeClass[size], variantClass[variant], className)}
      {...props}
    />
  )
}
Textarea.displayName = 'Textarea'

export { Textarea }
