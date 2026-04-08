import { cn } from '../../../lib/utils'
import type * as React from 'react'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot='textarea'
      className={cn(
        'flex min-h-[80px] w-full rounded-md border-2 border-border bg-card selection:bg-primary selection:text-primary-foreground px-3 py-2 text-sm font-medium text-foreground placeholder:text-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
