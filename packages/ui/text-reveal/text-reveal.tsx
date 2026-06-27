'use client'

import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

export interface TextRevealProps {
  text: string
  className?: string
  wordClassName?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: (i = 1) => ({
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.04 * i }
  })
}

const childVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: 'blur(10px)'
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)'
  }
}

export function TextReveal({ text, className, wordClassName }: TextRevealProps) {
  // Regex to split by words and punctuation, preserving them correctly
  const words = text.match(/[\p{L}\p{N}]+[^\s\p{L}\p{N}]?|[^\s]/gu) || []

  return (
    <div className={cn('inline-block', className)}>
      <motion.div
        variants={containerVariants}
        initial='hidden'
        animate='visible'
        className='flex flex-wrap justify-center'
      >
        {words.map((word, index) => (
          <motion.span
            key={index}
            variants={childVariants}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className={cn('mr-[0.25em] mt-0.5', wordClassName)}
          >
            {word}
          </motion.span>
        ))}
      </motion.div>
    </div>
  )
}
