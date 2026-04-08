import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../../lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-all gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'text-primary-foreground bg-primary border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        noShadow: 'text-primary-foreground bg-primary border-2 border-border',
        neutral:
          'bg-card text-foreground border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        reverse:
          'text-primary-foreground bg-primary border-2 border-border hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[4px_4px_0px_0px_var(--border)]'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'size-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return <Comp data-slot='button' className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
