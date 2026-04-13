'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { AIARing, AIASphere, useAIAContext } from '@atta/ui/canvas'
import { getAgentConfigByName } from '@/schemas'
import { CenterViewport } from './CenterViewport'

function getLabelPosition(index: number, total: number): 'top' | 'right' | 'bottom' | 'left' {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  const x = Math.cos(angle)
  const y = Math.sin(angle)
  if (Math.abs(y) >= Math.abs(x)) return y < 0 ? 'top' : 'bottom'
  return x > 0 ? 'right' : 'left'
}

const AGENT_COLORS: Record<string, string> = {
  strategist: '#4A9EDB',
  critic: '#DB4A4A',
  devils_advocate: '#9B59B6',
  synthesizer: '#C8A84B',
  researcher: '#4ADB7F',
  operator: '#DB9B4A'
}

interface RoundViewProps {
  round: number
  agents: { role: string; name: string }[]
  entries: { agent: string; content: string; round: number }[]
  activeAgent: string | null
  streamingContent: string
  isLive: boolean
  onRoundComplete?: () => void
}

export function RoundView({
  round,
  agents,
  entries,
  activeAgent,
  streamingContent,
  isLive,
  onRoundComplete
}: RoundViewProps) {
  const ctx = useAIAContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const prevContentRef = useRef('')
  const [ringSize, setRingSize] = useState(450)
  const [fadingOut, setFadingOut] = useState(false)

  // Responsive ring size
  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return
      const w = containerRef.current.getBoundingClientRect().width
      setRingSize(Math.min(w - 48, 480))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Fire directed message particles when an agent targets another
  useEffect(() => {
    const match = streamingContent.match(/\[TARGET:\s*([^\]]+)\]/i)
    if (match && !prevContentRef.current.includes(match[0]) && activeAgent && ctx) {
      ctx.fireDirectedMessage(activeAgent, match[1]!.trim())
    }
    prevContentRef.current = streamingContent
  }, [streamingContent, activeAgent, ctx])

  const completedAgents = new Set(entries.map((e) => e.agent))
  const synthEntry = entries.find((e) => getAgentConfigByName(e.agent).role === 'synthesizer')
  const isSynthesisComplete = !!synthEntry && !isLive

  // Round 1 opens all ring segments from the start (agents run in parallel).
  // Later rounds reveal one segment per completed agent.
  const activeStep = round === 1 && isLive ? agents.length : completedAgents.size

  // After synthesis is visible in the center (1.5s), fade out the ring
  useEffect(() => {
    if (!isSynthesisComplete || fadingOut) return
    const t = setTimeout(() => setFadingOut(true), 1500)
    return () => clearTimeout(t)
  }, [isSynthesisComplete, fadingOut])

  const activeConfig = activeAgent ? getAgentConfigByName(activeAgent) : null
  const centerSize = Math.max(130, Math.round(ringSize * 0.38))

  return (
    <div ref={containerRef} className='flex w-full justify-center py-8'>
      <motion.div
        animate={{ opacity: fadingOut ? 0 : 1, scale: fadingOut ? 0.95 : 1 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        onAnimationComplete={() => {
          if (fadingOut) onRoundComplete?.()
        }}
      >
        <AIARing
          size={ringSize}
          activeStep={activeStep}
          thinking={isLive}
          orbit={agents.map((agent, i) => (
            <AIASphere
              key={agent.role}
              id={agent.name}
              label={agent.name}
              labelPosition={getLabelPosition(i, agents.length)}
              color={AGENT_COLORS[agent.role] ?? 'var(--accent)'}
              size='lg'
              state={
                activeAgent === agent.name
                  ? 'speaking'
                  : round === 1 && isLive && !completedAgents.has(agent.name)
                    ? 'speaking'
                    : completedAgents.has(agent.name)
                      ? 'complete'
                      : 'idle'
              }
              showMatrix={
                activeAgent === agent.name ||
                (round === 1 && isLive && !completedAgents.has(agent.name)) ||
                completedAgents.has(agent.name)
              }
            />
          ))}
        >
          <div className='overflow-hidden rounded-xl bg-card p-3' style={{ width: centerSize, height: centerSize }}>
            <CenterViewport
              agentRole={activeConfig?.role ?? null}
              agentName={activeAgent}
              content={isSynthesisComplete ? (synthEntry?.content ?? '') : streamingContent}
              isStreaming={!!activeAgent && isLive && !isSynthesisComplete}
              isSynthesisComplete={isSynthesisComplete}
            />
          </div>
        </AIARing>
      </motion.div>
    </div>
  )
}
