import { cn } from '../../../lib/utils'
import type * as React from 'react'

const variantClasses: Record<string, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-border bg-background text-foreground'
}

function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors',
        variantClasses[variant] ?? '',
        className
      )}
      {...props}
    />
  )
}

Badge.displayName = 'Badge'

export { Badge }
