'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  className?: string
  /** Seconds to wait after the element enters the viewport — staggers siblings. */
  delay?: number
}

/**
 * Fades and lifts its children in the first time they scroll into view. Reduced motion is
 * handled once, by the `MotionConfig` at the page root, not per instance.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -15% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  )
}
