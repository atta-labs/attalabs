'use client'

import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

export interface TextRevealProps {
  text: string
  className?: string
  wordClassName?: string
  /** Word-wrap justification. Defaults to 'center' (the original, still-used-everywhere
   * behavior) — 'start' is for left-aligned body copy like a bullet list, where centered
   * line-wrapping reads wrong. */
  align?: 'center' | 'start'
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

export function TextReveal({ text, className, wordClassName, align = 'center' }: TextRevealProps) {
  // Regex to split by words and punctuation, preserving them correctly. The
  // `(?:['']\p{L}\p{N}+)*` group keeps contractions ("didn't", "who's") as a single
  // token — without it, the apostrophe greedily consumed as trailing punctuation and the
  // final letter ("t", "s") was left to wrap onto its own line as an orphan word.
  const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*[^\s\p{L}\p{N}]?|[^\s]/gu) || []

  return (
    <div className={cn('inline-block', className)}>
      <motion.div
        variants={containerVariants}
        initial='hidden'
        animate='visible'
        className={cn('flex flex-wrap', align === 'center' ? 'justify-center' : 'justify-start')}
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
