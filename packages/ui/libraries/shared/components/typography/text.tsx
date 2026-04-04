import * as React from 'react'
import { cn } from '../../../../lib/utils'
import type { TextProps } from '../../../../types/typography/text'

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

function Text({ as: Tag = 'p', size = 'md', weight, muted, className, ...props }: TextProps) {
  return (
    <Tag
      className={cn(sizeClasses[size], weight && weightClasses[weight], muted && 'text-muted-foreground', className)}
      {...props}
    />
  )
}
Text.displayName = 'Text'

export { Text }
