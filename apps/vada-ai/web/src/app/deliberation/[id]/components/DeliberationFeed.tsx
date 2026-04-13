'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { AIACanvas } from '@atta/ui/canvas'
import { RoundSection } from './RoundSection'
import { ConclusionPanel } from './ConclusionPanel'
import { useDeliberation } from './useDeliberation'
import { AGENT_THEME, ROUND_TITLES } from './agent-theme'
import { DEFAULT_ROOM, OPTIONAL_AGENTS } from '@/schemas'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'

const ALL_AGENT_CONFIGS = [...DEFAULT_ROOM, ...OPTIONAL_AGENTS]

interface DeliberationFeedProps {
  sessionId: string
  question: string
  agentRoles: string[]
  initialEntries?: Array<{ agent: string; content: string; round: number }>
  initialConclusion?: Record<string, unknown> | null
  initialState?: string
}

function DeliberationScene({
  sessionId,
  question,
  agentRoles,
  initialEntries = [],
  initialConclusion = null,
  initialState = 'PENDING'
}: DeliberationFeedProps) {
  const {
    messages,
    streamingMessage,
    loadingMessage,
    streamError,
    currentState,
    terminalState,
    conclusion,
    completedRounds
  } = useDeliberation(sessionId, question, initialEntries, initialConclusion, initialState)

  const isLiveSession = currentState !== 'TERMINAL'
  const showConclusion = !!terminalState
  const showLoading = ['CONCLUDING', 'AUDITING', 'REVISING'].includes(currentState) && !!loadingMessage

  // Only show rounds that have at least one non-empty entry
  const rounds = Array.from(new Set(messages.map((m) => m.round)))
    .filter((r) => messages.some((m) => m.round === r && m.content.trim().length > 0))
    .sort((a, b) => a - b)

  const currentRoundNum = currentState.startsWith('ROUND_')
    ? Number.parseInt(currentState.replace('ROUND_', ''), 10)
    : null

  // Detect interrupted session:
  // - Not live (page loaded with existing data, SSE closed or never started)
  // - No conclusion (didn't finish)
  // - Not PENDING (some work was done)
  // - Not currently streaming (not in the middle of a live deliberation)
  const isInterrupted = !isLiveSession && !showConclusion && initialState !== 'PENDING' && initialState !== 'TERMINAL'

  // Even TERMINAL sessions with no conclusion might be interrupted
  // (the old catch block forced TERMINAL + UNCONVERGED on errors)
  const isTerminalButEmpty =
    initialState === 'TERMINAL' &&
    !initialConclusion &&
    terminalState === 'UNCONVERGED' &&
    initialEntries.length > 0 &&
    initialEntries.length < agentRoles.length * 3 // less than full 3 rounds

  // ── Auto-scroll ──
  const feedEndRef = useRef<HTMLDivElement>(null)
  const prevMessageCount = useRef(messages.length)

  useEffect(() => {
    if (messages.length !== prevMessageCount.current || loadingMessage || showConclusion) {
      prevMessageCount.current = messages.length
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages.length, loadingMessage, showConclusion])

  useEffect(() => {
    if (streamingMessage) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [streamingMessage?.content])

  // Figure out which round the interruption happened in
  const interruptedRoundLabel = initialState?.replace('_', ' ').toLowerCase() ?? 'unknown state'

  return (
    <div className='relative z-10 flex min-h-dvh flex-col'>
      {/* Error banner */}
      {streamError && (
        <div className='fixed inset-x-0 top-14 z-50 mx-auto max-w-2xl px-4'>
          <div className='flex items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 shadow-lg'>
            <p className='text-sm text-destructive'>{streamError}</p>
            <Link
              href='/deliberate'
              className='mt-0.5 shrink-0 text-sm text-destructive/70 underline transition-opacity hover:opacity-70'
            >
              Back
            </Link>
          </div>
        </div>
      )}
      {/* Sticky header */}
      <StickyHeaderTopBar>
        <div className='mx-auto flex h-full w-full max-w-[640px] items-center gap-3 px-5'>
          <span className='min-w-0 flex-1 truncate text-xs '>
            {question.length > 60 ? `${question.slice(0, 60)}...` : question}
          </span>
          <div className='hidden items-center gap-1 sm:flex'>
            {agentRoles.map((role) => {
              const cfg = ALL_AGENT_CONFIGS.find((a) => a.role === role)
              const name = cfg?.name ?? role
              return (
                <div
                  key={role}
                  className='size-1.5 rounded-full'
                  style={{ background: AGENT_THEME[name]?.color }}
                  title={name}
                />
              )
            })}
          </div>
          {/* Status badge */}
          {isInterrupted || isTerminalButEmpty ? (
            <span className='shrink-0 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] tracking-wide text-yellow-500'>
              interrupted
            </span>
          ) : isLiveSession ? (
            <span className='shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] tracking-wide text-accent'>
              {currentState.replace('_', ' ').toLowerCase()}
            </span>
          ) : (
            <span className='shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] tracking-wide text-green-500'>
              complete
            </span>
          )}
        </div>
      </StickyHeaderTopBar>

      {/* Main feed */}
      <div className='mx-auto w-full max-w-[640px] flex-1 px-5 pb-32 pt-6'>
        {/* Question card */}
        <div className='mb-8 rounded-xl border border-border bg-card p-4'>
          <div className='mb-2 text-[9px] font-semibold uppercase tracking-[0.25em] '>Your Question</div>
          <p className='m-0 text-base leading-relaxed text-foreground/90'>{question}</p>
        </div>

        {/* Interrupted session banner */}
        {(isInterrupted || isTerminalButEmpty) && (
          <div className='mb-6 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4'>
            <div className='mb-1 text-sm font-medium text-yellow-500'>Deliberation interrupted</div>
            <p className='mb-3 text-[13px] leading-relaxed text-yellow-500/70'>
              This session was interrupted during {interruptedRoundLabel}.
              {rounds.length > 0 && (
                <>
                  {' '}
                  Round{rounds.length > 1 ? `s ${rounds.join(', ')}` : ` ${rounds[0]}`}{' '}
                  {rounds.length > 1 ? 'have' : 'has'} partial data.
                </>
              )}
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() => window.location.reload()}
                className='rounded-md bg-yellow-500/15 px-3 py-1.5 text-xs font-medium text-yellow-500 transition-colors hover:bg-yellow-500/25'
              >
                Resume Deliberation
              </button>
              <Link
                href='/deliberate'
                className='rounded-md bg-muted/50 px-3 py-1.5 text-xs font-medium  transition-colors hover:bg-muted'
              >
                Start Fresh
              </Link>
            </div>
          </div>
        )}

        {/* Rounds — only those with non-empty entries */}
        {rounds.map((round) => {
          const roundMessages = messages.filter((m) => m.round === round && m.content.trim().length > 0)
          const isCurrentRound = currentRoundNum === round
          const roundStreamMsg = isCurrentRound && streamingMessage?.round === round ? streamingMessage : null
          const isRoundDone = completedRounds.has(round)

          return (
            <RoundSection
              key={round}
              round={round}
              entries={roundMessages}
              streamingMessage={roundStreamMsg}
              isLive={isCurrentRound}
              isRoundComplete={isRoundDone}
              expectedAgentCount={agentRoles.length}
            />
          )
        })}

        {/* Waiting for a round that has no messages yet — only show if live */}
        {currentRoundNum && !rounds.includes(currentRoundNum) && isLiveSession && (
          <div className='mb-6'>
            <div className='mb-4 flex items-center gap-3 px-1'>
              <div className='h-px flex-1 bg-border' />
              <span className='whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.35em] '>
                Round {currentRoundNum} — {ROUND_TITLES[currentRoundNum] ?? ''}
              </span>
              <div className='h-px flex-1 bg-border' />
            </div>
            <div className='flex items-center justify-center gap-2.5 py-8 text-sm '>
              <span className='size-1.5 animate-pulse rounded-full bg-muted-foreground' />
              {currentRoundNum === 1
                ? 'Agents are forming their positions...'
                : `Agents are reading Round ${currentRoundNum - 1}...`}
            </div>
          </div>
        )}

        {/* Loading state during conclusion protocol */}
        {showLoading && (
          <div className='flex items-center justify-center gap-2.5 py-8 text-sm '>
            <span className='size-1.5 animate-pulse rounded-full bg-accent' />
            {loadingMessage}
          </div>
        )}

        {/* Conclusion — only show if we actually have a terminal state and it's not an interrupted empty session */}
        {showConclusion && terminalState && !isTerminalButEmpty && (
          <div className='pb-24 pt-4'>
            <ConclusionPanel terminalState={terminalState} conclusion={conclusion} />
            <div className='mt-4 flex gap-2.5'>
              <button
                type='button'
                className='flex-1 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium  transition-colors hover:text-foreground'
              >
                Export
              </button>
              <Link
                href='/deliberate'
                className='flex-1 rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90'
              >
                New Deliberation
              </Link>
            </div>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={feedEndRef} />
      </div>
    </div>
  )
}

// ── Outer wrapper — AIACanvas with ambient particles ──
export function DeliberationFeed(props: DeliberationFeedProps) {
  return (
    <AIACanvas
      particleCount={400}
      ambientRatio={0.5}
      wanderDuration={30}
      alwaysRenderSpheres
      className='fixed inset-0 h-full w-full bg-background z-0'
    >
      <DeliberationScene {...props} />
    </AIACanvas>
  )
}
