'use client'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../../../lib/utils'

const buttonVariants = cva(
  'font-medium transition-all rounded outline-hidden cursor-pointer duration-200 flex items-center justify-center gap-2 border-2 border-black',
  {
    variants: {
      variant: {
        default:
          'shadow-md hover:shadow active:shadow-none bg-primary text-primary-foreground hover:translate-y-1 active:translate-y-2 active:translate-x-1',
        secondary:
          'shadow-md hover:shadow active:shadow-none bg-secondary text-secondary-foreground hover:translate-y-1 active:translate-y-2',
        outline:
          'shadow-md hover:shadow active:shadow-none bg-background text-foreground hover:translate-y-1 active:translate-y-2',
        ghost: 'border-transparent shadow-none hover:bg-accent hover:text-accent-foreground',
        link: 'border-transparent shadow-none text-primary underline-offset-4 hover:underline',
        destructive:
          'shadow-md hover:shadow active:shadow-none bg-destructive text-destructive-foreground hover:translate-y-1 active:translate-y-2'
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
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
