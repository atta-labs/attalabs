'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Text } from '@atta/ui'
import { AgentBadge } from '@/components/AgentBadge'

interface CenterViewportProps {
  agentRole: string | null
  agentName: string | null
  content: string
  isStreaming: boolean
  isSynthesisComplete?: boolean
}

export function CenterViewport({
  agentRole,
  agentName,
  content,
  isStreaming,
  isSynthesisComplete
}: CenterViewportProps) {
  if (isSynthesisComplete) {
    return (
      <motion.div
        key='synthesis'
        className='flex h-full flex-col gap-2 overflow-hidden'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <span className='shrink-0 text-[9px] uppercase tracking-widest text-[color:var(--synthesis)]/60'>
          — Synthesis
        </span>
        <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
          <Text as='p' size='xs' className='whitespace-pre-wrap leading-relaxed text-[color:var(--synthesis)]'>
            {content}
          </Text>
        </div>
      </motion.div>
    )
  }

  if (!agentName) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='flex items-center gap-1.5 '>
          <motion.span
            className='h-1 w-1 rounded-full bg-current'
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
          />
          <Text as='span' size='xs'>
            Thinking…
          </Text>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={agentName}
        className='flex h-full flex-col gap-2 overflow-hidden'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className='shrink-0'>
          <AgentBadge agentRole={agentRole ?? 'strategist'} name={agentName} />
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
          <Text as='p' size='xs' className='whitespace-pre-wrap leading-relaxed '>
            {content}
            {isStreaming && (
              <motion.span
                className='ml-0.5 inline-block text-accent'
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
              >
                |
              </motion.span>
            )}
          </Text>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
