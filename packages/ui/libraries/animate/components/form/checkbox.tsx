'use client'

import {
  CheckboxIndicator as CheckboxIndicatorPrimitive,
  Checkbox as CheckboxPrimitive
} from '@atta/ui/animate/installed/checkbox'
import { cn } from '@atta/ui/lib/utils'
import type { CheckboxProps as CheckboxPropsContract } from '@atta/ui/types'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

type CheckboxPrimitiveProps = Omit<React.ComponentProps<typeof CheckboxPrimitive>, 'ref'>

const checkboxVariants = cva(
  'peer shrink-0 flex items-center justify-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-500 focus-visible:ring-offset-2 [&[data-state=checked],&[data-state=indeterminate]]:bg-primary [&[data-state=checked],&[data-state=indeterminate]]:text-primary-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background border',
        accent: 'bg-input'
      },
      size: {
        default: 'size-5 rounded-sm',
        sm: 'size-4.5 rounded-[5px]',
        lg: 'size-6 rounded-[7px]'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

const checkboxIndicatorVariants = cva('', {
  variants: {
    size: {
      default: 'size-3.5',
      sm: 'size-3',
      lg: 'size-4'
    }
  },
  defaultVariants: {
    size: 'default'
  }
})

interface CheckboxProps extends CheckboxPropsContract, VariantProps<typeof checkboxVariants> {}

function Checkbox({ className, children, variant, size, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive
      className={cn(checkboxVariants({ variant, size, className }))}
      {...(props as CheckboxPrimitiveProps)}
    >
      {children}
      <CheckboxIndicatorPrimitive className={cn(checkboxIndicatorVariants({ size }))} />
    </CheckboxPrimitive>
  )
}

export { Checkbox, type CheckboxProps }
