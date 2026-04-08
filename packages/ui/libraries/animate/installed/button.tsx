'use client'

import { Slot, type WithAsChild } from './slot'
import { type HTMLMotionProps, motion } from 'motion/react'

type ButtonProps = WithAsChild<
  HTMLMotionProps<'button'> & {
    hoverScale?: number
    tapScale?: number
  }
>

function Button({ hoverScale = 1.05, tapScale = 0.95, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : motion.button

  return <Component whileTap={{ scale: tapScale }} whileHover={{ scale: hoverScale }} {...props} />
}

export { Button, type ButtonProps }
