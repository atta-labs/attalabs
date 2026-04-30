// Serialize a completed deliberation into a shareable markdown transcript.
// Triggered from the conclusion card. Keeps the BYOK architecture story clean —
// the transcript is built entirely in the browser from data already on screen.

import type { DeliberationMessage } from './useDeliberation'

interface ConclusionShape {
  recommendation?: string
  key_condition?: string
  unresolved_points?: Array<{ point: string; agents_involved: string[] }>
  review_by?: string
  participants?: Array<{ agent: string; version: string }>
  _criticVerdict?: string | null
}

export interface TranscriptInput {
  question: string
  messages: DeliberationMessage[]
  terminalState: string | null
  conclusion: ConclusionShape | Record<string, unknown> | null
  /** Label-enriched model entries per agent role; included on every round + in the final conclusion. */
  modelByRole?: Record<string, { provider: string; modelId: string; label?: string }>
}

export function buildTranscriptMarkdown(input: TranscriptInput): string {
  const lines: string[] = []
  lines.push('# Vāda Deliberation Transcript')
  lines.push('')
  lines.push('## Question')
  lines.push('')
  lines.push(`> ${input.question.trim()}`)
  lines.push('')

  const rounds = Array.from(new Set(input.messages.map((m) => m.round))).sort((a, b) => a - b)
  for (const round of rounds) {
    lines.push(`## Round ${round}`)
    lines.push('')
    // Deduped model list for the agents that spoke in THIS round. Older
    // sessions without modelByRole simply omit this line.
    if (input.modelByRole) {
      const rolesInRound = Array.from(new Set(input.messages.filter((m) => m.round === round).map((m) => m.agentRole)))
      const seen = new Set<string>()
      const pills: string[] = []
      for (const role of rolesInRound) {
        const m = input.modelByRole[role]
        if (!m) continue
        const key = `${m.provider}:${m.modelId}`
        if (seen.has(key)) continue
        seen.add(key)
        pills.push(m.label ? `${m.label} (${m.provider}:${m.modelId})` : `${m.provider}:${m.modelId}`)
      }
      if (pills.length > 0) {
        lines.push(`**Models:** ${pills.join(', ')}`)
        lines.push('')
      }
    }
    const roundMsgs = input.messages.filter((m) => m.round === round)
    for (const m of roundMsgs) {
      lines.push(`### ${m.agent}`)
      if (m.replyTarget) lines.push(`_replying to ${m.replyTarget}_`)
      lines.push('')
      lines.push(m.content.trim())
      lines.push('')
    }
  }

  if (input.terminalState || input.conclusion) {
    lines.push('## Conclusion')
    lines.push('')
    if (input.terminalState) {
      lines.push(`**Terminal state:** ${input.terminalState}`)
      lines.push('')
    }
    const c = (input.conclusion ?? {}) as ConclusionShape
    // UNCONVERGED transcripts should explain WHY — the Blind Critic's verdict
    // tells the reader what was wrong with the synthesis they're about to see.
    if (input.terminalState === 'UNCONVERGED' && c._criticVerdict) {
      lines.push('> Flagged during review. The Blind Critic rejected the synthesis with:')
      lines.push('>')
      lines.push(`> ${c._criticVerdict}`)
      lines.push('>')
      lines.push("> The team's best synthesis is shown below — treat it as a working answer, not a final one.")
      lines.push('')
    }
    if (c.recommendation) {
      lines.push('### Recommendation')
      lines.push('')
      lines.push(c.recommendation)
      lines.push('')
    }
    if (c.key_condition) {
      lines.push('### Key condition')
      lines.push('')
      lines.push(c.key_condition)
      lines.push('')
    }
    if (Array.isArray(c.unresolved_points) && c.unresolved_points.length > 0) {
      lines.push('### Unresolved points')
      lines.push('')
      for (const up of c.unresolved_points) {
        lines.push(`- ${up.point} _(${up.agents_involved.join(', ')})_`)
      }
      lines.push('')
    }
    if (c.review_by) {
      lines.push(`**Review by:** ${c.review_by}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function downloadTranscript(input: TranscriptInput): void {
  const markdown = buildTranscriptMarkdown(input)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const a = document.createElement('a')
  a.href = url
  a.download = `vada-deliberation-${stamp}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyTranscriptToClipboard(input: TranscriptInput): Promise<void> {
  const markdown = buildTranscriptMarkdown(input)
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('Clipboard API not available')
  }
  await navigator.clipboard.writeText(markdown)
}

// Serialize a single round's messages into markdown. Used by the per-round
// copy/export icons in the RoundStrip header.
export function buildRoundMarkdown(
  question: string,
  round: number,
  roundTitle: string,
  entries: DeliberationMessage[],
  models: Array<{ provider: string; modelId: string; label: string }> = []
): string {
  const lines: string[] = []
  lines.push(`# Round ${round} — ${roundTitle}`)
  lines.push('')
  if (models.length > 0) {
    lines.push(`**Models:** ${models.map((m) => `${m.label} (${m.provider}:${m.modelId})`).join(', ')}`)
    lines.push('')
  }
  lines.push('## Question')
  lines.push('')
  lines.push(`> ${question.trim()}`)
  lines.push('')
  for (const m of entries) {
    lines.push(`### ${m.agent}`)
    if (m.replyTarget) lines.push(`_replying to ${m.replyTarget}_`)
    lines.push('')
    lines.push(m.content.trim())
    lines.push('')
  }
  return lines.join('\n')
}
