'use client'

import { Input as InputPrimitive } from '../../installed/input'
import { cn } from '../../../../lib/utils'
import type { InputBlockProps, InputProps } from '../../../../types'

const sizeClass: Record<string, string> = {
  sm: 'h-8',
  default: 'h-10',
  lg: 'h-12'
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

function InputBlock({ className, leftSection, rightSection, error, children }: InputBlockProps) {
  return (
    <div className={cn('w-full flex gap-1 items-center', error && 'border-destructive', className)}>
      {leftSection}
      {children}
      {rightSection}
    </div>
  )
}
InputBlock.displayName = 'InputBlock'

function Input({
  className,
  variant = 'default',
  size = 'default',
  error,
  leftSection,
  rightSection,
  ...props
}: InputProps) {
  const input = (
    <InputPrimitive
      aria-invalid={error || undefined}
      className={cn(sizeClass[size], variantClass[variant], (leftSection || rightSection) && 'flex-1', className)}
      {...props}
    />
  )
  if (!leftSection && !rightSection) return input
  return (
    <InputBlock leftSection={leftSection} rightSection={rightSection} error={error}>
      {input}
    </InputBlock>
  )
}
Input.displayName = 'Input'

export { Input, InputBlock }
