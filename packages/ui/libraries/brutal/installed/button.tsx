'use client'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all gap-2 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'text-primary-foreground bg-primary border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        destructive:
          'text-destructive-foreground bg-destructive border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        outline:
          'bg-background border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        secondary:
          'text-secondary-foreground bg-secondary border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        ghost: 'hover:bg-accent hover:text-accent-foreground border-2 border-transparent',
        link: 'text-primary underline-offset-4 hover:underline border-0'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

interface ButtonPrimitiveProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonPrimitiveProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className='mr-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
