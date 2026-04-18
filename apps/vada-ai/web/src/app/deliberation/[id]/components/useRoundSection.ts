// ── useRoundSection.ts ────────────────────────────────────────────────────────
// Default: live round is expanded, completed rounds collapse to a one-line
// synthesizer teaser. User can expand any past round on demand. No auto-
// collapse timer — the "snap after 1.5s" pattern made scrolling jittery.

import { useEffect, useState } from 'react'
import { AGENT_THEME, ROUND_TITLES } from './agent-theme'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

interface UseRoundSectionProps {
  round: number
  entries: DeliberationMessage[]
  streamingMessage?: StreamingMessage | null
  isLive: boolean
  isRoundComplete: boolean
  expectedAgentCount: number
}

// Extract the first sentence or first ~160 chars of a synthesizer's output,
// stripping any leftover Universal-Anchor reminders some models leak.
function extractTeaser(text: string): string {
  const cleaned = text
    .replace(/\[CRITICAL REMINDER[\s\S]*?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  const firstSentence = cleaned.match(/^[^.!?\n]+[.!?]/)?.[0]?.trim()
  const teaser = firstSentence ?? cleaned
  return teaser.length > 160 ? `${teaser.slice(0, 157).trimEnd()}…` : teaser
}

export function useRoundSection({
  round,
  entries,
  streamingMessage,
  isLive,
  isRoundComplete,
  expectedAgentCount
}: UseRoundSectionProps) {
  // Default: live → expanded, completed → collapsed. User can override.
  const [isExpanded, setIsExpanded] = useState(isLive)

  // When a round becomes live, expand it. When it finishes, collapse it
  // (only once — if the user manually expands later, we respect that).
  const [userTouched, setUserTouched] = useState(false)
  useEffect(() => {
    if (userTouched) return
    if (isLive) setIsExpanded(true)
    else if (isRoundComplete) setIsExpanded(false)
  }, [isLive, isRoundComplete, userTouched])

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

  const teaser = synthEntry
    ? extractTeaser(synthEntry.content)
    : deliberationEntries.length > 0
      ? extractTeaser(deliberationEntries[deliberationEntries.length - 1]?.content ?? '')
      : ''

  const getAgentColor = (agent: string) => AGENT_THEME[agent]?.color ?? 'hsl(var(--muted-foreground))'

  return {
    isExpanded,
    expand: () => {
      setIsExpanded(true)
      setUserTouched(true)
    },
    collapse: () => {
      setIsExpanded(false)
      setUserTouched(true)
    },
    toggle: () => {
      setIsExpanded((v) => !v)
      setUserTouched(true)
    },
    title,
    validEntries,
    synthEntry,
    deliberationEntries,
    agentNames,
    isWaiting,
    wasInterrupted,
    missingCount,
    isEmpty,
    teaser,
    getAgentColor
  }
}
