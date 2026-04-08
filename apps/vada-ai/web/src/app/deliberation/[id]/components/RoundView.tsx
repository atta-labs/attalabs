'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { AIARing, AIASphere, useAIAContext } from '@atta/ui/canvas'
import { getAgentConfigByName } from '@/schemas'
import { CenterViewport } from './CenterViewport'
import { SynthesisCard } from './SynthesisCard'

const AGENT_COLORS: Record<string, string> = {
  strategist: '#4A9EDB',
  critic: '#DB4A4A',
  devils_advocate: '#9B59B6',
  synthesizer: '#C8A84B'
}

interface RoundViewProps {
  round: number
  agents: { role: string; name: string }[]
  entries: { agent: string; content: string; round: number }[]
  allEntries: { agent: string; content: string; round: number }[]
  activeAgent: string | null
  streamingContent: string
  isLive: boolean
  currentState: string
}

export function RoundView({
  round,
  agents,
  entries,
  allEntries,
  activeAgent,
  streamingContent,
  isLive,
  currentState
}: RoundViewProps) {
  const ctx = useAIAContext()
  const prevContent = useRef('')
  const completedAgents = new Set(entries.map((e) => e.agent))
  const synthesisEntry = entries.find((e) => e.agent === 'Synthesizer')

  useEffect(() => {
    const match = streamingContent.match(/\[TARGET:\s*([^\]]+)\]/i)
    if (match && !prevContent.current.includes(match[0]) && activeAgent && ctx) {
      ctx.fireDirectedMessage(activeAgent, match[1]!.trim())
    }
    prevContent.current = streamingContent
  }, [streamingContent, activeAgent, ctx])

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const displayAgent = isLive
    ? activeAgent || (entries.length > 0 ? entries[entries.length - 1]?.agent : null)
    : selectedAgent
  const displayEntry = entries.find((e) => e.agent === displayAgent)
  const displayContent = isLive && activeAgent === displayAgent ? streamingContent : (displayEntry?.content ?? '')
  const displayConfig = displayAgent ? getAgentConfigByName(displayAgent) : null

  return (
    <div className='w-full flex flex-col items-center'>
      <div className='relative w-[400px] h-[400px] flex items-center justify-center'>
        <AIARing
          size={400}
          orbit={agents.map((agent) => (
            <AIASphere
              key={agent.role}
              id={agent.name}
              label={agent.name}
              color={AGENT_COLORS[agent.role]}
              size='lg'
              // Ensure state triggers formation in Round 1
              state={
                round === 1 && currentState === 'ROUND_1' && !completedAgents.has(agent.name)
                  ? 'speaking'
                  : activeAgent === agent.name
                    ? 'speaking'
                    : completedAgents.has(agent.name)
                      ? 'complete'
                      : 'idle'
              }
              onClick={() => !isLive && setSelectedAgent(agent.name)}
            />
          ))}
        >
          {displayConfig && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className='w-[200px] h-[200px] bg-background/60 backdrop-blur-md border border-white/5 rounded-xl p-4 shadow-2xl overflow-hidden'
            >
              <CenterViewport
                agentRole={displayConfig.role}
                agentName={displayConfig.name}
                content={displayContent}
                isStreaming={isLive && activeAgent === displayAgent}
              />
            </motion.div>
          )}
        </AIARing>
      </div>

      {synthesisEntry && (
        <div className='mt-8 w-full max-w-xl'>
          <SynthesisCard synthesisContent={synthesisEntry.content} allEntries={allEntries} round={round} />
        </div>
      )}
    </div>
  )
}
