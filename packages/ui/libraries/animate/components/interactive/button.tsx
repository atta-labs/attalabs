'use client'

import { Slot } from '@radix-ui/react-slot'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { buttonVariants } from '../../../basic/components/interactive/button'
import type { ButtonProps } from '../../../../types'
import React from 'react'

type AnimateButtonProps = ButtonProps & {
  hoverScale?: number
  tapScale?: number
}

const Button = React.forwardRef<HTMLButtonElement, AnimateButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      children,
      loading,
      iconLeft,
      iconRight,
      hoverScale = 1.03,
      tapScale = 0.97,
      asChild,
      onClick,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot className={buttonVariants({ variant, size, className })} ref={ref} {...props}>
          {children}
        </Slot>
      )
    }

    return (
      <motion.button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        whileHover={{ scale: hoverScale }}
        whileTap={{ scale: tapScale }}
        disabled={loading ?? false}
        onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
        {...(props as any)}
      >
        <span className='relative z-10 flex w-full items-center justify-center gap-2'>
          {loading && <Loader2 className='h-4 w-4 animate-spin' />}
          {!loading && iconLeft}
          {children}
          {!loading && iconRight}
        </span>
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
