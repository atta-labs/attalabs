import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../../../lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import React, { type ButtonHTMLAttributes } from 'react'

export const buttonVariants = cva(
  'font-head transition-all rounded outline-hidden cursor-pointer duration-200 font-medium flex items-center',
  {
    variants: {
      variant: {
        default:
          'shadow-[4px_4px_0px_0px_var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none bg-primary text-primary-foreground border-2 border-border transition hover:translate-y-0.5 active:translate-y-1 active:translate-x-0.5',
        secondary:
          'shadow-[4px_4px_0px_0px_var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none bg-secondary text-secondary-foreground border-2 border-border transition hover:translate-y-0.5 active:translate-y-1 active:translate-x-0.5',
        destructive:
          'shadow-[4px_4px_0px_0px_var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none bg-destructive text-destructive-foreground border-2 border-border transition hover:translate-y-0.5 active:translate-y-1 active:translate-x-0.5',
        outline:
          'shadow-[4px_4px_0px_0px_var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none bg-transparent border-2 border-border transition hover:translate-y-0.5 active:translate-y-1 active:translate-x-0.5',
        link: 'bg-transparent hover:underline',
        ghost: 'bg-transparent hover:bg-accent'
      },
      size: {
        default: 'px-4 py-1.5 text-base',
        xs: 'px-2 py-0.5 text-xs',
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-1.5 text-base',
        lg: 'px-6 lg:px-8 py-2 lg:py-3 text-md lg:text-lg',
        icon: 'p-2',
        'icon-xs': 'p-1',
        'icon-sm': 'p-1.5',
        'icon-lg': 'p-3'
      }
    },
    defaultVariants: {
      size: 'md',
      variant: 'default'
    }
  }
)

export interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, IButtonProps>(
  ({ children, size = 'md', className = '', variant = 'default', asChild = false, ...props }, forwardedRef) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp ref={forwardedRef} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </Comp>
    )
  }
)

Button.displayName = 'Button'
