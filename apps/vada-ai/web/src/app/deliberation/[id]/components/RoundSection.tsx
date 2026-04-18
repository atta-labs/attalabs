// ── RoundSection.tsx ──────────────────────────────────────────────────────────
// Compact-by-default layout: completed rounds show a one-line teaser and can
// be expanded by the user. Only the live round shows all agent cards +
// streaming content. Past rounds stay quiet until the user asks.

'use client'

import { Check, ChevronRight } from 'lucide-react'
import { AgentCard } from './AgentCard'
import { AGENT_THEME } from './agent-theme'
import { WaveConnector } from './WaveConnector'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'
import { useRoundSection } from './useRoundSection'

interface RoundSectionProps {
  round: number
  entries: DeliberationMessage[]
  streamingMessage?: StreamingMessage | null
  isLive?: boolean
  isRoundComplete?: boolean
  expectedAgentCount?: number
  teamName?: string
  agentModels?: Record<string, { provider: string; modelId: string }>
}

export function RoundSection({
  round,
  entries,
  streamingMessage,
  isLive = false,
  isRoundComplete = false,
  expectedAgentCount = 4,
  teamName = 'Deliberation',
  agentModels
}: RoundSectionProps) {
  const {
    isExpanded,
    toggle,
    title,
    validEntries,
    synthEntry,
    deliberationEntries,
    isWaiting,
    wasInterrupted,
    missingCount,
    isEmpty,
    teaser,
    getAgentColor
  } = useRoundSection({ round, entries, streamingMessage, isLive, isRoundComplete, expectedAgentCount })

  if (isEmpty) return null

  return (
    <div className='mb-6'>
      {/* Round header */}
      <div className='mb-4 flex items-center gap-3 px-1'>
        <div className='h-px flex-1 bg-border' />
        <span className='whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.35em]'>
          Round {round} — {title}
        </span>
        {isRoundComplete && !wasInterrupted && (
          <span className='size-1.5 rounded-full bg-success/60' title='Complete' />
        )}
        {wasInterrupted && <span className='size-1.5 rounded-full bg-warning/60' title='Interrupted' />}
        <div className='h-px flex-1 bg-border' />
      </div>

      {/* Waiting state — round live but no entries yet */}
      {isWaiting && (
        <div className='flex items-center justify-center gap-2.5 py-8 text-sm text-muted-foreground'>
          <span className='size-1.5 animate-pulse rounded-full bg-muted-foreground' />
          {round === 1 ? 'Agents are forming their positions…' : `Agents are reading Round ${round - 1}…`}
        </div>
      )}

      {/* LIVE round: show agent progress strip + any streaming/completed content */}
      {isLive && !isWaiting && (
        <div>
          <AgentProgressStrip
            teamName={teamName}
            expectedCount={expectedAgentCount}
            completedAgents={validEntries.map((e) => e.agent)}
            streamingAgent={streamingMessage?.agent ?? null}
          />

          <div className='mt-3'>
            {deliberationEntries.map((entry, i) => {
              const nextEntry = deliberationEntries[i + 1] ?? synthEntry
              const showWave = !!nextEntry
              const currentColor = getAgentColor(entry.agent)
              const nextColor = nextEntry ? getAgentColor(nextEntry.agent) : currentColor
              return (
                <div key={entry.id}>
                  <AgentCard
                    agent={entry.agent}
                    content={entry.content}
                    target={entry.replyTarget}
                    isLast={false}
                    modelId={agentModels?.[entry.agentRole]?.modelId}
                  />
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

            {streamingMessage && (
              <AgentCard
                agent={streamingMessage.agent}
                content={streamingMessage.content}
                target={streamingMessage.replyTarget}
                isLast
                isStreaming
                modelId={agentModels?.[streamingMessage.agentRole]?.modelId}
              />
            )}

            {synthEntry && !streamingMessage && (
              <AgentCard
                agent={synthEntry.agent}
                content={synthEntry.content}
                target={synthEntry.replyTarget}
                isLast
                modelId={agentModels?.[synthEntry.agentRole]?.modelId}
              />
            )}
          </div>
        </div>
      )}

      {/* COMPLETED round: collapsed teaser, expandable to full agents */}
      {!isLive && !isWaiting && validEntries.length > 0 && (
        <div>
          <button
            type='button'
            onClick={toggle}
            className='flex w-full items-start gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 text-left transition-colors hover:border-muted-foreground/40 hover:bg-card'
          >
            <ChevronRight
              className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              aria-hidden
            />
            <div className='flex-1 space-y-1.5'>
              <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground'>
                <span className='uppercase tracking-widest'>{teamName}</span>
                <span>·</span>
                <span>{validEntries.length} perspectives</span>
                {synthEntry && (
                  <>
                    <span>·</span>
                    <span
                      className='inline-flex items-center gap-1 font-mono'
                      style={{ color: AGENT_THEME[synthEntry.agent]?.color }}
                    >
                      <Check className='size-2.5' /> Synthesizer
                    </span>
                  </>
                )}
              </div>
              {teaser && (
                <p className='m-0 text-sm leading-relaxed text-foreground/80'>
                  {isExpanded ? 'Collapse round' : teaser}
                </p>
              )}
            </div>
          </button>

          {isExpanded && (
            <div className='mt-3'>
              {deliberationEntries.map((entry, i) => {
                const nextEntry = deliberationEntries[i + 1] ?? synthEntry
                const showWave = !!nextEntry
                const currentColor = getAgentColor(entry.agent)
                const nextColor = nextEntry ? getAgentColor(nextEntry.agent) : currentColor
                return (
                  <div key={entry.id}>
                    <AgentCard
                      agent={entry.agent}
                      content={entry.content}
                      target={entry.replyTarget}
                      isLast={false}
                      modelId={agentModels?.[entry.agentRole]?.modelId}
                    />
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
              {synthEntry && (
                <AgentCard
                  agent={synthEntry.agent}
                  content={synthEntry.content}
                  target={synthEntry.replyTarget}
                  isLast
                  modelId={agentModels?.[synthEntry.agentRole]?.modelId}
                />
              )}
            </div>
          )}

          {wasInterrupted && <InterruptedBanner missingCount={missingCount} />}
        </div>
      )}
    </div>
  )
}

// ── AgentProgressStrip ────────────────────────────────────────────────────────
// Live round header: pills for each expected agent, ✓ when done, pulsing when
// currently streaming. Gives a glanceable progress view without having to read
// through all the agent content yet.

function AgentProgressStrip({
  teamName,
  expectedCount,
  completedAgents,
  streamingAgent
}: {
  teamName: string
  expectedCount: number
  completedAgents: string[]
  streamingAgent: string | null
}) {
  const agentList = [...completedAgents]
  if (streamingAgent && !completedAgents.includes(streamingAgent)) agentList.push(streamingAgent)
  const pendingCount = Math.max(0, expectedCount - agentList.length)
  return (
    <div className='flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 px-4 py-3'>
      <span className='text-[10px] uppercase tracking-widest text-muted-foreground'>{teamName}</span>
      <span className='text-[10px] text-muted-foreground'>·</span>
      {agentList.map((agent) => {
        const isStreaming = agent === streamingAgent
        const color = AGENT_THEME[agent]?.color ?? 'hsl(var(--muted-foreground))'
        return (
          <span key={agent} className='inline-flex items-center gap-1 font-mono text-[10px]' style={{ color }}>
            {isStreaming ? (
              <span className='size-1.5 animate-pulse rounded-full' style={{ backgroundColor: color }} />
            ) : (
              <Check className='size-2.5' />
            )}
            {agent}
          </span>
        )
      })}
      {pendingCount > 0 && <span className='text-[10px] text-muted-foreground'>· {pendingCount} more</span>}
    </div>
  )
}

function InterruptedBanner({ missingCount }: { missingCount: number }) {
  return (
    <div className='mt-3 flex items-center gap-2 rounded-md border border-warning/20 bg-warning/5 px-3 py-2'>
      <span className='size-1.5 rounded-full bg-warning/60' />
      <span className='text-[11px] text-warning-foreground/70'>
        Round interrupted — {missingCount} {missingCount === 1 ? 'agent' : 'agents'} did not complete
      </span>
    </div>
  )
}
