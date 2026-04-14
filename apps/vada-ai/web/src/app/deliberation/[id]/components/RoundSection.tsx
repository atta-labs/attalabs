// ── RoundSection.tsx ──────────────────────────────────────────────────────────

'use client'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@atta/ui'
import { AgentCard } from './AgentCard'
import { WaveConnector } from './WaveConnector'
import { useRoundSection } from './useRoundSection'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

interface RoundSectionProps {
  round: number
  entries: DeliberationMessage[]
  streamingMessage?: StreamingMessage | null
  isLive?: boolean
  isRoundComplete?: boolean
  expectedAgentCount?: number
  teamName?: string
}

export function RoundSection({
  round,
  entries,
  streamingMessage,
  isLive = false,
  isRoundComplete = false,
  expectedAgentCount = 4,
  teamName = 'Deliberation'
}: RoundSectionProps) {
  const {
    isExpanded,
    expand,
    collapse,
    title,
    validEntries,
    synthEntry,
    deliberationEntries,
    agentNames,
    isWaiting,
    wasInterrupted,
    missingCount,
    isEmpty,
    getAgentColor
  } = useRoundSection({ round, entries, streamingMessage, isLive, isRoundComplete, expectedAgentCount })

  if (isEmpty) return null

  return (
    <div className='mb-6'>
      {/* Round header */}
      <div className='mb-4 flex items-center gap-3 px-1'>
        <div className='h-px flex-1 bg-border' />
        <span className='whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.35em] '>
          Round {round} — {title}
        </span>
        {isRoundComplete && !wasInterrupted && (
          <span className='size-1.5 rounded-full bg-green-500/50' title='Complete' />
        )}
        {wasInterrupted && <span className='size-1.5 rounded-full bg-yellow-500/50' title='Interrupted' />}
        <div className='h-px flex-1 bg-border' />
      </div>

      {/* Waiting */}
      {isWaiting && (
        <div className='flex items-center justify-center gap-2.5 py-8 text-sm '>
          <span className='size-1.5 animate-pulse rounded-full bg-muted-foreground' />
          {round === 1 ? 'Agents are forming their positions...' : `Agents are reading Round ${round - 1}...`}
        </div>
      )}

      {validEntries.length > 0 && (
        <Collapsible open={isExpanded} onOpenChange={(open) => (open ? expand() : collapse())}>
          {/* Toggle trigger — hidden while round is live */}
          {deliberationEntries.length > 0 && !isLive && (
            <CollapsibleTrigger className='mb-3 flex w-full items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5 text-left transition-colors hover:border-muted-foreground/20 hover:bg-card'>
              {isExpanded ? (
                <>
                  <span className='text-[11px] text-muted-foreground'>Collapse round</span>
                  <span className='ml-auto text-[11px] text-muted-foreground'>▾</span>
                </>
              ) : (
                <>
                  <span className='text-[11px]'>
                    {teamName} · {agentNames}
                  </span>
                  <span className='ml-auto text-[11px]'>▸</span>
                </>
              )}
            </CollapsibleTrigger>
          )}

          {/* Collapsible deliberation entries */}
          <CollapsibleContent>
            {deliberationEntries.map((entry, i) => {
              const nextEntry = deliberationEntries[i + 1] ?? synthEntry
              const showWave = !!nextEntry
              const currentColor = getAgentColor(entry.agent)
              const nextColor = nextEntry ? getAgentColor(nextEntry.agent) : currentColor

              return (
                <div key={entry.id}>
                  <AgentCard agent={entry.agent} content={entry.content} target={entry.replyTarget} isLast={false} />
                  {showWave && (
                    <div className='flex'>
                      <div className='w-[70px] shrink-0' />
                      <div className='flex flex-1 justify-center'>
                        <WaveConnector fromColor={currentColor} toColor={nextColor} height={64} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Currently streaming */}
            {streamingMessage && (
              <AgentCard
                agent={streamingMessage.agent}
                content={streamingMessage.content}
                target={streamingMessage.replyTarget}
                isLast
                isStreaming
              />
            )}
          </CollapsibleContent>

          {/* Synthesizer — always visible */}
          {synthEntry && (
            <AgentCard
              agent={synthEntry.agent}
              content={synthEntry.content}
              target={synthEntry.replyTarget}
              isLast={!streamingMessage}
            />
          )}

          {wasInterrupted && <InterruptedBanner missingCount={missingCount} />}
        </Collapsible>
      )}
    </div>
  )
}

// ── Small presentational sub-component ────────────────────────────────────────

function InterruptedBanner({ missingCount }: { missingCount: number }) {
  return (
    <div className='mt-3 flex items-center gap-2 rounded-md border border-yellow-500/15 bg-yellow-500/5 px-3 py-2'>
      <span className='size-1.5 rounded-full bg-yellow-500/50' />
      <span className='text-[11px] text-yellow-500/70'>
        Round interrupted — {missingCount} {missingCount === 1 ? 'agent' : 'agents'} did not complete
      </span>
    </div>
  )
}
