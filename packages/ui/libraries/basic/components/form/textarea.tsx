'use client'

import { Textarea as TextareaPrimitive } from '../../installed/textarea'
import { cn } from '../../../../lib/utils'
import type { TextareaProps } from '../../../../types'

const sizeClass: Record<string, string> = {
  sm: 'min-h-[4rem]',
  default: 'min-h-[6rem]',
  lg: 'min-h-[8rem]'
}

const variantClass: Record<string, string> = {
  default: 'border-border',
  underlined: 'rounded-none border-0 border-b px-0 focus-visible:ring-0 focus-visible:border-b-2',
  filled: 'bg-muted/50 focus-visible:bg-muted/60',
  ghost: 'border-transparent bg-transparent focus-visible:ring-0 focus-visible:border-transparent',
  neubrutalism:
    'border-2 border-foreground rounded-sm shadow-[2px_2px_0px] shadow-muted-foreground focus-visible:ring-0',
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
