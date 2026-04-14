import { cn } from '../../../lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const rootVariants = cva('px-2 transition duration-200', {
  variants: {
    variant: {
      // outline
      default:
        'border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background rounded-[var(--radius)]',
      underlined:
        'border-b border-input bg-transparent focus-within:border-b-2 focus-within:border-ring rounded-none px-0',
      filled: 'bg-muted text-foreground focus-within:bg-muted/80 rounded-[var(--radius)]',
      ghost: 'bg-transparent text-foreground focus-within:bg-muted rounded-[var(--radius)]',
      neubrutalism:
        'border border-foreground rounded-sm shadow-[2px_2px_0px_hsl(var(--muted-foreground))] focus-within:bg-accent/20'
      // with floating label
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

const textareaVariants = cva('', {
  variants: {
    size: {
      sm: 'min-h-[4rem]',
      default: 'min-h-[6rem]',
      lg: 'min-h-[8rem]'
    }
  },
  defaultVariants: {
    size: 'default'
  }
})

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof rootVariants>,
    VariantProps<typeof textareaVariants> {
  textareaClassName?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, size, textareaClassName, ...props }, ref) => {
    return (
      <div className={cn(rootVariants({ variant }), className)}>
        <textarea
          data-slot='textarea'
          className={cn(
            'w-full py-1 bg-transparent ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none text-base resize-vertical',
            textareaVariants({ size }),
            textareaClassName
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
