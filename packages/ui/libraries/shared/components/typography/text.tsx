import { cn } from '../../../../lib/utils'
import type { TextProps } from '../../../../types'
import * as React from 'react'

const sizeClasses: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
}

const weightClasses: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
}

const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ as: Tag = 'p', size = 'md', weight, muted, className, children, ...props }, ref) => {
    return (
      <Tag
        ref={ref as any}
        className={cn(sizeClasses[size], weight && weightClasses[weight], muted && 'text-muted-foreground', className)}
        {...props}
      >
        {children}
      </Tag>
    )
  }
)
Text.displayName = 'Text'

export { Text }
