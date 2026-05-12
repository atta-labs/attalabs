'use client'

import { ModelIcon } from '@atta/ui'
import { AGENTS } from '@/components/agents/visuals'
import { motion } from 'motion/react'
import type { CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AGENT_THEME, TERMINAL_BADGE, type TerminalStateKey } from './agent-theme'
import { MARKDOWN_COMPONENTS } from './markdown-components'

interface ConclusionPanelProps {
  terminalState: string
  conclusion: Record<string, unknown> | null
  agentModels?: Record<string, { provider: string; modelId: string }> | null
  hasSynthesizer?: boolean
}

export function ConclusionPanel({
  terminalState,
  conclusion,
  agentModels,
  hasSynthesizer = true
}: ConclusionPanelProps) {
  const badge = TERMINAL_BADGE[terminalState as TerminalStateKey] ?? TERMINAL_BADGE.UNCONVERGED
  const criticVerdict = typeof conclusion?._criticVerdict === 'string' ? (conclusion._criticVerdict as string) : null
  const isFlagged = terminalState === 'UNCONVERGED' && !!criticVerdict
  const isError = terminalState === 'ERROR'

  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className='mb-5 flex items-center gap-3'>
          <div className='h-px flex-1 bg-border' />
          <span className='text-[10px] uppercase tracking-[0.4em] '>Conclusion</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
          >
            {badge.label}
          </span>
          <div className='h-px flex-1 bg-border' />
        </div>
        <div className='flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5'>
          <div className='text-[9px] font-semibold uppercase tracking-[0.2em] text-destructive'>Synthesis failed</div>
          <p className='m-0 text-sm leading-relaxed text-foreground/85'>
            The Synthesizer's output could not be parsed into a valid conclusion. The deliberation rounds themselves
            completed successfully — you can copy the transcript above.
          </p>
          <p className='m-0 text-sm leading-relaxed text-muted-foreground'>
            This usually happens when the synthesis model runs out of output tokens or returns malformed JSON. Try
            running the deliberation again, switch to a model with a larger output budget, or use a more capable model
            for the synthesizer role.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className='mb-5 flex items-center gap-3'>
        <div className='h-px flex-1 bg-border' />
        <span className='text-[10px] uppercase tracking-[0.4em] '>Conclusion</span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
        <div className='h-px flex-1 bg-border' />
      </div>

      {/* Conclusion card */}
      <div className='flex flex-col gap-5 rounded-xl border border-border bg-card p-5'>
        {isFlagged && (
          <div className='rounded-md border border-warning/40 bg-warning/5 p-3'>
            <div className='mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-warning'>
              Flagged during review
            </div>
            <p className='m-0 text-[12px] leading-relaxed text-foreground/70'>
              The Blind Critic flagged the synthesizer's recommendation. The team's best synthesis is shown below —
              treat it as a working answer, not a final one.
            </p>
            <p className='m-0 mt-2 text-[12px] leading-relaxed text-foreground/85'>
              <span className='font-semibold'>Critic:</span> {criticVerdict}
            </p>
          </div>
        )}
        {conclusion ? (
          <>
            {/* Recommendation */}
            <div>
              <div className='mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] '>Recommendation</div>
              <div className='text-[15px] leading-[1.7] text-foreground/85'>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                  {conclusion.recommendation as string}
                </ReactMarkdown>
              </div>
            </div>

            {/* Key Condition */}
            <div className='border-t border-border pt-4'>
              <div className='mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] '>Key Condition</div>
              <div className='text-[13px] leading-relaxed'>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                  {conclusion.key_condition as string}
                </ReactMarkdown>
              </div>
            </div>

            {/* Unresolved Points */}
            {Array.isArray(conclusion.unresolved_points) &&
              (conclusion.unresolved_points as Array<{ point: string; agents_involved: string[] }>).length > 0 && (
                <div className='border-t border-border pt-4'>
                  <div className='mb-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] '>Unresolved</div>
                  <div className='space-y-2.5'>
                    {(conclusion.unresolved_points as Array<{ point: string; agents_involved: string[] }>).map(
                      (up, i) => {
                        // Display-time rescue: older sessions have `point` as a
                        // JSON-stringified `{ agents, disagreement }` because the
                        // parser fell back to JSON.stringify. Try to unwrap.
                        let displayPoint = up.point
                        let displayAgents = up.agents_involved
                        if (typeof displayPoint === 'string') {
                          const trimmed = displayPoint.trim()
                          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                            try {
                              const inner = JSON.parse(trimmed) as Record<string, unknown>
                              const textKeys = [
                                'point',
                                'point_of_disagreement',
                                'pointOfDisagreement',
                                'disagreement',
                                'disement',
                                'description',
                                'statement',
                                'summary',
                                'issue',
                                'text'
                              ]
                              for (const k of textKeys) {
                                const v = inner[k]
                                if (typeof v === 'string' && v.trim().length > 0) {
                                  displayPoint = v
                                  break
                                }
                              }
                              if (Array.isArray(inner.agents) && displayAgents.length === 0) {
                                displayAgents = inner.agents.filter((a): a is string => typeof a === 'string')
                              }
                            } catch {
                              // leave as-is
                            }
                          }
                        }
                        return (
                          <div key={i} className='border-l-2 border-border pl-3'>
                            <p className='m-0 text-[13px] leading-snug /70'>{displayPoint}</p>
                            <div className='mt-1 flex gap-1.5'>
                              {displayAgents.map((a) => (
                                <span
                                  key={a}
                                  className='text-[10px] font-medium text-[var(--agent-color)]'
                                  style={
                                    {
                                      '--agent-color': AGENT_THEME[a]?.color ?? 'var(--muted-foreground)'
                                    } as CSSProperties
                                  }
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                </div>
              )}

            {/* Review By */}
            {typeof conclusion.review_by === 'string' && (
              <div className='flex items-center justify-between border-t border-border pt-3'>
                <span className='text-[9px] font-semibold uppercase tracking-[0.2em] '>Review by</span>
                <span className='text-xs '>{conclusion.review_by as string}</span>
              </div>
            )}

            {/* Participants */}
            {Array.isArray(conclusion.participants) &&
              (conclusion.participants as Array<{ agent: string; version: string }>).length > 0 && (
                <div className='flex items-center justify-between border-t border-border pt-3'>
                  <span className='text-[9px] font-semibold uppercase tracking-[0.2em] '>Participants</span>
                  <div className='flex items-center gap-2'>
                    {(conclusion.participants as Array<{ agent: string; version: string }>).map((p) => {
                      const role = AGENTS[p.agent as keyof typeof AGENTS]?.role
                      const modelId = role ? agentModels?.[role]?.modelId : undefined
                      return (
                        <div key={p.agent} className='flex items-center gap-1'>
                          {modelId && <ModelIcon model={modelId} size={14} type='avatar' />}
                          <span
                            className='text-[10px] font-medium text-[var(--agent-color)]'
                            style={
                              {
                                '--agent-color': AGENT_THEME[p.agent]?.color ?? 'var(--muted-foreground)'
                              } as CSSProperties
                            }
                          >
                            {p.agent}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
          </>
        ) : hasSynthesizer ? (
          <p className='m-0 text-sm text-muted-foreground'>
            The synthesizer did not produce a renderable conclusion. The reviewer outputs above are still available;
            copy the transcript to preserve them.
          </p>
        ) : (
          <p className='m-0 text-sm text-muted-foreground'>
            This team produces parallel reviewer outputs without a unified conclusion. Each reviewer's response above is
            independent — read them together to form your own judgment.
          </p>
        )}
      </div>
    </motion.div>
  )
}
