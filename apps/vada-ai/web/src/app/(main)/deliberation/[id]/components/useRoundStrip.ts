'use client'

// Hook that powers a single round strip. Owns all state + effects + async
// handlers so RoundStrip itself is pure presentation (project rule: hooks
// aggregate behavior, components render).
//
// Responsibilities:
//   1. Derive per-agent state for the round from existing deliberation data.
//   2. Fire a directed particle between spheres when the speaker changes
//      (handoff animation). Must be called inside an <AIACanvas> tree —
//      useAIAContext returns null outside one.
//   3. Own manual selection state + the "display speaker" priority:
//      currentSpeaker > manualSelection > lastDoneSpeaker.
//   4. Build the status badge class map, the deduped per-round model list
//      (with catalog-resolved labels), and the copy/download handlers for
//      that round's markdown export.
//
// Sphere ID convention: `round-${round}-${agentRole}`. Unique per round so
// particles don't migrate between strips (see canvas/CLAUDE.md "Unique
// Sphere IDs").

import { useToastContext } from '@atta/ui/components'
import { useAIAContext } from '@atta/ui/canvas'
import { useCatalog } from '@atta/models'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type AgentState, deriveAgentStates, findCurrentSpeaker, findLastDoneSpeaker } from './deriveAgentStates'
import { ROUND_TITLES } from './agent-theme'
import { buildRoundMarkdown } from './transcript-export'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

export function sphereIdFor(round: number, role: string): string {
  return `round-${round}-${role}`
}

export interface RoundModelPill {
  provider: string
  modelId: string
  label: string
}

export interface RoundStatusBadge {
  label: string
  className: string
}

interface UseRoundStripProps {
  round: number
  question: string
  agentRoles: string[]
  modelByRole: Record<string, { provider: string; modelId: string }>
  entries: DeliberationMessage[]
  streamingMessage: StreamingMessage | null
  isLive: boolean
  isRoundComplete: boolean
  phaseTitles?: Record<number, string>
}

export function useRoundStrip({
  round,
  question,
  agentRoles,
  modelByRole,
  entries,
  streamingMessage,
  isLive,
  isRoundComplete,
  phaseTitles
}: UseRoundStripProps) {
  const ctx = useAIAContext()
  const catalog = useCatalog()
  const { successToast, errorToast } = useToastContext()

  const [manualSelection, setManualSelection] = useState<string | null>(null)

  const agentStates: AgentState[] = useMemo(
    () => deriveAgentStates(agentRoles, entries, streamingMessage, round),
    [agentRoles, entries, streamingMessage, round]
  )

  const currentSpeaker = useMemo(() => findCurrentSpeaker(agentStates), [agentStates])
  const lastDoneSpeaker = useMemo(() => findLastDoneSpeaker(agentStates), [agentStates])

  // Selection priority: live speaker > manual click > last done. During
  // streaming the manual override is ignored so the card tracks tokens.
  const displaySpeaker = currentSpeaker ?? manualSelection ?? lastDoneSpeaker
  const displayState = useMemo(
    () => agentStates.find((s) => s.role === displaySpeaker) ?? null,
    [agentStates, displaySpeaker]
  )

  // Handoff animation: when the speaker transitions from A to B, fire a
  // particle from A's sphere to B's sphere. The canvas provides the particle
  // rendering (~230ms flight).
  //
  // `prevSpeakerRef` tracks the last *non-null* speaker. Between agents
  // there's a brief window where streamingMessage is null, so currentSpeaker
  // goes null → next-speaker. If we overwrote prev with null in that gap,
  // the handoff would never fire.
  const prevSpeakerRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevSpeakerRef.current
    const current = currentSpeaker
    if (prev && current && prev !== current && ctx) {
      ctx.fireDirectedMessage(sphereIdFor(round, prev), sphereIdFor(round, current))
    }
    if (current) prevSpeakerRef.current = current
  }, [currentSpeaker, round, ctx])

  const roundTitle = phaseTitles?.[round] ?? ROUND_TITLES[round] ?? `Round ${round}`

  const statusBadge: RoundStatusBadge = isRoundComplete
    ? { label: 'Done', className: 'border-success text-success' }
    : isLive
      ? { label: 'Live', className: 'border-primary text-primary' }
      : { label: 'Pending', className: 'border-border text-muted-foreground' }

  // Deduped list of models used in this round. Most runs are single-model
  // but per-agent configs can produce a mix; show each once.
  const roundModels: RoundModelPill[] = useMemo(() => {
    const out: RoundModelPill[] = []
    const seen = new Set<string>()
    for (const role of agentRoles) {
      const m = modelByRole[role]
      if (!m) continue
      const key = `${m.provider}:${m.modelId}`
      if (seen.has(key)) continue
      seen.add(key)
      const entry = catalog.find((e) => e.route === m.provider && e.modelId === m.modelId)
      out.push({ provider: m.provider, modelId: m.modelId, label: entry?.label ?? m.modelId })
    }
    return out
  }, [agentRoles, modelByRole, catalog])

  const exportMarkdown = useCallback(
    () => buildRoundMarkdown(question, round, roundTitle, entries, roundModels),
    [question, round, roundTitle, entries, roundModels]
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportMarkdown())
      successToast('Copied', `Round ${round} transcript is on your clipboard.`)
    } catch (e) {
      errorToast('Could not copy', e instanceof Error ? e.message : 'Clipboard unavailable.')
    }
  }, [exportMarkdown, round, successToast, errorToast])

  const handleDownload = useCallback(() => {
    try {
      const blob = new Blob([exportMarkdown()], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vada-round-${round}.md`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      errorToast('Could not download', e instanceof Error ? e.message : 'Download failed.')
    }
  }, [exportMarkdown, round, errorToast])

  return {
    agentStates,
    currentSpeaker,
    displaySpeaker,
    displayState,
    manualSelection,
    setManualSelection,
    roundTitle,
    statusBadge,
    roundModels,
    handleCopy,
    handleDownload
  }
}
