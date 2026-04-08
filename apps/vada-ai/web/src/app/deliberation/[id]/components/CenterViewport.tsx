'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Text } from '@atta/ui'
import { AgentBadge } from '@/components/AgentBadge'

interface CenterViewportProps {
  agentRole: string
  agentName: string
  content: string
  isStreaming: boolean
}

export function CenterViewport({ agentRole, agentName, content, isStreaming }: CenterViewportProps) {
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
          <AgentBadge agentRole={agentRole} name={agentName} />
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto pr-1'>
          <Text as='p' size='xs' className='whitespace-pre-wrap leading-relaxed text-muted-foreground'>
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
