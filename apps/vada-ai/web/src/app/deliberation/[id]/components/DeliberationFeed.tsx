'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import { AIACanvas } from '@atta/ui/canvas'
import { getAgentConfigByName } from '@/schemas'
import { ChatBubble } from './ChatBubble'
import { ConclusionPanel } from './ConclusionPanel'
import { AGENT_COLORS, MessageCard } from './MessageCard'
import { useDeliberation } from './useDeliberation'
import type { DeliberationMessage } from './useDeliberation'

// ── Round metadata ────────────────────────────────────────────────────────────

const ROUND_META: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Initial Positions', subtitle: 'Four independent views, revealed together' },
  2: { title: 'Adversarial Collision', subtitle: 'Agents challenge and refine positions' },
  3: { title: 'Convergence', subtitle: 'Synthesising toward a conclusion' }
}

// Sphere placement: top-row cards (even rows) get sphere at bottom so it faces
// downward toward the cluster centre; bottom-row cards get sphere at top.
function getSpherePosition(index: number): 'top' | 'bottom' {
  return Math.floor(index / 2) % 2 === 0 ? 'bottom' : 'top'
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DeliberationFeedProps {
  sessionId: string
  question: string
  agentRoles: string[]
  initialEntries?: Array<{ agent: string; content: string; round: number }>
  initialConclusion?: Record<string, unknown> | null
  initialState?: string
}

export function DeliberationFeed({
  sessionId,
  question,
  agentRoles,
  initialEntries = [],
  initialConclusion = null,
  initialState = 'PENDING'
}: DeliberationFeedProps) {
  const {
    messages,
    round1Buffer,
    round1Ready,
    streamingMessage,
    loadingMessage,
    currentState,
    terminalState,
    conclusion
  } = useDeliberation(sessionId, question, initialEntries, initialConclusion, initialState)

  // Scroll to the most recent card for a given agent display name
  const scrollToMessage = useCallback((targetAgentName: string) => {
    const config = getAgentConfigByName(targetAgentName)
    const all = document.querySelectorAll<HTMLElement>(`[data-agent="${config.role}"]`)
    const target = all[all.length - 1]
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.style.transition = 'box-shadow 0.15s ease-out'
    target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)'
    setTimeout(() => {
      target.style.boxShadow = ''
    }, 1400)
  }, [])

  // Group completed messages by round
  const messagesByRound = messages.reduce<Record<number, DeliberationMessage[]>>((acc, msg) => {
    acc[msg.round] ??= []
    acc[msg.round]!.push(msg)
    return acc
  }, {})

  // Determine which round sections to render
  const visibleRounds = [
    ...new Set([
      ...Object.keys(messagesByRound).map(Number),
      ...(round1Ready || round1Buffer.length > 0 || currentState === 'ROUND_1' ? [1] : []),
      ...(streamingMessage && streamingMessage.round > 1 ? [streamingMessage.round] : [])
    ])
  ].sort((a, b) => a - b)

  const isLive = currentState !== 'TERMINAL'
  const showConclusion = !!terminalState

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      {/* ── Sticky top bar ─────────────────────────────────────────── */}
      <div className='sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm'>
        <div className='mx-auto flex max-w-3xl items-center gap-3 px-4 py-3'>
          {/* Back */}
          <Link
            href='/'
            className='flex shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground'
          >
            <ArrowLeft className='h-4 w-4' />
          </Link>

          {/* Truncated question */}
          <span className='min-w-0 flex-1 truncate text-xs text-muted-foreground' title={question}>
            {question}
          </span>

          {/* Agent pills */}
          <div className='hidden shrink-0 items-center gap-1.5 sm:flex'>
            {agentRoles.map((role) => (
              <span
                key={role}
                className='h-2 w-2 rounded-full'
                style={
                  {
                    '--agent-color': AGENT_COLORS[role] ?? 'var(--muted-foreground)',
                    backgroundColor: 'var(--agent-color)'
                  } as React.CSSProperties
                }
                title={role.replace('_', ' ')}
              />
            ))}
          </div>

          {/* Status badge — lowercase */}
          <span
            className='shrink-0 rounded-full px-2 py-0.5 text-[10px]'
            style={
              isLive
                ? {
                    backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                    color: 'var(--accent)'
                  }
                : {
                    backgroundColor: 'color-mix(in srgb, var(--success) 15%, transparent)',
                    color: 'var(--success)'
                  }
            }
          >
            {isLive ? currentState.replace('_', ' ').toLowerCase() : 'complete'}
          </span>
        </div>
      </div>

      {/* ── Main feed — wrapped in AIACanvas so AIASpheres have context ── */}
      <AIACanvas particleCount={80} ambientRatio={0.3} wanderDuration={40} className='flex-1'>
        <div className='transition-opacity duration-700' style={{ opacity: showConclusion ? 0.35 : 1 }}>
          <div className='mx-auto max-w-3xl px-4 pb-32 pt-8'>
            {/* User question */}
            <ChatBubble variant='user' label='Your Question'>
              {question}
            </ChatBubble>

            {/* Rounds */}
            {visibleRounds.map((round) => {
              const roundMessages = messagesByRound[round] ?? []
              const meta = ROUND_META[round] ?? { title: `Round ${round}`, subtitle: '' }
              const isRound1 = round === 1
              const isCurrentRound = currentState === `ROUND_${round}`

              // Combine completed + active streaming card for correct grid index
              const streamingInThisRound = streamingMessage?.round === round ? streamingMessage : null
              const totalCards = roundMessages.length + (streamingInThisRound ? 1 : 0)

              return (
                <div key={round} className='mt-12'>
                  {/* Round divider */}
                  <div className='mb-8 flex items-center gap-4'>
                    <div className='h-px flex-1 bg-border' />
                    <div className='text-center'>
                      <p className='text-[9px] uppercase tracking-[0.35em] text-muted-foreground/40'>Round {round}</p>
                      <p className='mt-0.5 text-sm font-medium text-muted-foreground'>{meta.title}</p>
                      {meta.subtitle && <p className='mt-0.5 text-[11px] text-muted-foreground/50'>{meta.subtitle}</p>}
                    </div>
                    <div className='h-px flex-1 bg-border' />
                  </div>

                  {/* ── Round 1: simultaneous reveal, held until all 4 ready ── */}
                  {isRound1 && (
                    <>
                      {!round1Ready && (
                        <div className='flex items-center justify-center gap-2.5 py-10 text-sm text-muted-foreground'>
                          <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-accent' />
                          Agents are forming their initial positions…
                        </div>
                      )}

                      {round1Ready && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4 }}
                          className='grid grid-cols-1 gap-4 md:grid-cols-2'
                        >
                          {roundMessages.map((msg, i) => (
                            <MessageCard
                              key={msg.id}
                              message={msg}
                              spherePosition={getSpherePosition(i)}
                              onReplyClick={scrollToMessage}
                            />
                          ))}
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* ── Rounds 2+: sequential, same 2-col grid ──────────── */}
                  {!isRound1 && (
                    <>
                      {/* Loading placeholder before any cards in this round */}
                      {totalCards === 0 && isCurrentRound && loadingMessage && (
                        <div className='flex items-center gap-2.5 px-1 py-3 text-sm text-muted-foreground'>
                          <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50' />
                          {loadingMessage}
                        </div>
                      )}

                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        {/* Completed cards */}
                        {roundMessages.map((msg, i) => (
                          <MessageCard
                            key={msg.id}
                            message={msg}
                            spherePosition={getSpherePosition(i)}
                            onReplyClick={scrollToMessage}
                          />
                        ))}

                        {/* Active streaming card */}
                        {streamingInThisRound && (
                          <MessageCard
                            key={`streaming-${streamingInThisRound.agentRole}`}
                            message={streamingInThisRound}
                            isStreaming
                            spherePosition={getSpherePosition(roundMessages.length)}
                            onReplyClick={scrollToMessage}
                          />
                        )}
                      </div>

                      {/* Loading indicator between agents (after at least one card) */}
                      {isCurrentRound && loadingMessage && !streamingInThisRound && totalCards > 0 && (
                        <div className='mt-4 flex items-center gap-2.5 px-1 py-3 text-sm text-muted-foreground'>
                          <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50' />
                          {loadingMessage}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}

            <div className='h-32' />
          </div>
        </div>
      </AIACanvas>

      {/* ── Conclusion overlay ─────────────────────────────────────── */}
      {showConclusion && terminalState && (
        <div className='fixed inset-x-0 bottom-0 z-50 px-4 pb-8 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:pb-0'>
          <div className='w-full max-w-2xl'>
            <ConclusionPanel terminalState={terminalState} conclusion={conclusion} />
            <div className='mt-4 flex gap-3'>
              <button
                type='button'
                className='flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground'
              >
                Export
              </button>
              <Link
                href='/deliberate'
                className='flex-1 rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-medium text-background transition-opacity hover:opacity-90'
              >
                Start New Deliberation
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
