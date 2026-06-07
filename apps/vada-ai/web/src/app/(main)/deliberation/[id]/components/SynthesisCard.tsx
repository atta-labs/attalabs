'use client'

import { motion } from 'motion/react'
import { useState } from 'react'
import { Card, CardContent, Text } from '@atta/ui/components'
import { AgentBadge } from '@/components/AgentBadge'
import { getAgentConfigByName } from '@/schemas'

interface TranscriptEntry {
  agent: string
  content: string
  round: number
}

interface SynthesisCardProps {
  synthesisContent: string
  allEntries: TranscriptEntry[]
  round: number
}

export function SynthesisCard({ synthesisContent, allEntries, round }: SynthesisCardProps) {
  const [expanded, setExpanded] = useState(false)
  const nonSynthesisEntries = allEntries.filter((e) => e.round === round && e.agent !== 'Synthesizer')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Card>
        <CardContent className='p-4'>
          <div className='mb-2 flex items-center justify-between'>
            <AgentBadge agentRole='synthesizer' name='Synthesis' />
            {nonSynthesisEntries.length > 0 && (
              <button
                type='button'
                onClick={() => setExpanded(!expanded)}
                className='text-[10px] uppercase tracking-wider  transition-colors hover:text-accent'
              >
                {expanded ? '▲ Hide' : '▼ All agents'}
              </button>
            )}
          </div>

          <Text as='p' size='sm' className='whitespace-pre-wrap leading-relaxed'>
            {synthesisContent}
          </Text>

          {expanded && (
            <motion.div
              className='mt-4 space-y-3 border-t border-border pt-4'
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              {nonSynthesisEntries.map((entry, i) => {
                const config = getAgentConfigByName(entry.agent)
                return (
                  <div key={i} className='space-y-1'>
                    <AgentBadge agentRole={config.role} name={entry.agent} />
                    <Text as='p' size='xs' className='whitespace-pre-wrap leading-relaxed '>
                      {entry.content}
                    </Text>
                  </div>
                )
              })}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
