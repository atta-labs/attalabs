import { cn } from '../../../lib/utils'
import type { TextareaProps } from '../../../types'

export function Textarea({
  placeholder = 'Enter text...',
  className = '',
  textareaClassName,
  variant: _variant,
  error: _error,
  ...props
}: TextareaProps) {
  return (
    <textarea
      placeholder={placeholder}
      rows={4}
      className={cn(
        'px-4 py-2 w-full border-2 rounded border-border shadow-md transition focus:outline-hidden focus:shadow-xs placeholder:text-muted-foreground',
        className,
        textareaClassName
      )}
      {...props}
    />
  )
}
