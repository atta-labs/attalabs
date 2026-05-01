'use client'

import { motion } from 'motion/react'

interface ConclusionCardProps {
  round: number
  content: string
}

export function ConclusionCard({ round, content }: ConclusionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className='flex w-full justify-end'
    >
      <div className='w-full max-w-2xl rounded-2xl rounded-br-none border border-[color:var(--synthesis)]/30 bg-[color:var(--synthesis)]/8 p-6'>
        <span className='mb-2 block text-[10px] uppercase tracking-widest text-[color:var(--synthesis)]/60'>
          Round {round} — Synthesis
        </span>
        <div className='text-lg text-foreground/90'>{content}</div>
      </div>
    </motion.div>
  )
}
