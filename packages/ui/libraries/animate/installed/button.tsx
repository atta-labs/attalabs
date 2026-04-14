'use client'

import { motion } from 'framer-motion'
import { Flex } from '../../shared'
import type { ButtonProps } from '../../../types'
import { buttonVariants } from '../../basic/installed/button'
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
      hoverScale = 1.03,
      tapScale = 0.97,
      onClick,
      ...props
    },
    ref
  ) => {
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
        <Flex className='relative z-10 w-full' gap={2} justify='center' align='center'>
          {children}
        </Flex>
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button, type AnimateButtonProps as ButtonProps }
