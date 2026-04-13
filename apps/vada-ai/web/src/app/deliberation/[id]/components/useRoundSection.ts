// ── useRoundSection.ts ────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { AGENT_THEME, ROUND_TITLES } from './agent-theme'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

const AUTO_COLLAPSE_DELAY = 1500

interface UseRoundSectionProps {
  round: number
  entries: DeliberationMessage[]
  streamingMessage?: StreamingMessage | null
  isLive: boolean
  isRoundComplete: boolean
  expectedAgentCount: number
}

export function useRoundSection({
  round,
  entries,
  streamingMessage,
  isLive,
  isRoundComplete,
  expectedAgentCount
}: UseRoundSectionProps) {
  const [isExpanded, setIsExpanded] = useState(isLive)
  const hasAutoCollapsed = useRef(false)

  // Derived data
  const title = ROUND_TITLES[round] ?? ''
  const validEntries = entries.filter((e) => e.content.trim().length > 0)
  const synthEntry = validEntries.find((e) => e.agentRole === 'synthesizer') ?? null
  const deliberationEntries = validEntries.filter((e) => e.agentRole !== 'synthesizer')
  const agentNames = deliberationEntries.map((e) => e.agent).join(', ')
  const isWaiting = isLive && validEntries.length === 0 && !streamingMessage
  const wasInterrupted =
    !isLive && isRoundComplete && validEntries.length > 0 && validEntries.length < expectedAgentCount
  const missingCount = expectedAgentCount - validEntries.length
  const isEmpty = validEntries.length === 0 && !isLive && !streamingMessage

  // Auto-expand when round goes live
  useEffect(() => {
    if (isLive) {
      setIsExpanded(true)
      hasAutoCollapsed.current = false
    }
  }, [isLive])

  // Auto-collapse after round completes
  useEffect(() => {
    if (isRoundComplete && !hasAutoCollapsed.current && !wasInterrupted) {
      const timer = setTimeout(() => {
        setIsExpanded(false)
        hasAutoCollapsed.current = true
      }, AUTO_COLLAPSE_DELAY)
      return () => clearTimeout(timer)
    }
  }, [isRoundComplete, wasInterrupted])

  // Agent colors for wave connectors
  const getAgentColor = (agent: string) => AGENT_THEME[agent]?.color ?? 'hsl(var(--muted-foreground))'

  return {
    // State
    isExpanded,
    expand: () => setIsExpanded(true),
    collapse: () => setIsExpanded(false),

    // Derived
    title,
    validEntries,
    synthEntry,
    deliberationEntries,
    agentNames,
    isWaiting,
    wasInterrupted,
    missingCount,
    isEmpty,

    // Helpers
    getAgentColor
  }
}
