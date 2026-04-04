import * as React from 'react'
import { cn } from '../../../lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded border-2 bg-transparent px-3 py-2 text-sm shadow-md transition-all placeholder:text-muted-foreground focus:shadow-xs focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      rows={4}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
