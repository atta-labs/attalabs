'use client'

// Presentational only. State + effects + scroll handling + error toasting
// all live in useDeliberationScene. TranscriptActions uses its own hook.

import type { RouteProvider } from '@atta/models'
import { Button } from '@atta/ui'
import { AIACanvas } from '@atta/ui/canvas'
import { NextLink } from '@atta/ui/lib/next-link'
import { useMemo } from 'react'
import { ConclusionPanel } from './ConclusionPanel'
import { RoundStrip } from './RoundStrip'
import { TranscriptActions } from './TranscriptActions'
import { useDeliberationScene } from './useDeliberationScene'
import { useJudgeBenchmark } from './useJudgeBenchmark'

export interface BenchmarkClientState {
  baselineAvailable: boolean
  baselineAnswer: string | null
  judgeAvailable: boolean
}

interface DeliberationFeedProps {
  sessionId: string
  question: string
  agentRoles: string[]
  agentModels?: Record<string, { provider: string; modelId: string }>
  modelByRole?: Record<string, { provider: string; modelId: string }>
  defaultProvider?: string | null
  defaultModelId?: string | null
  initialEntries?: Array<{ agent: string; content: string; round: number }>
  initialConclusion?: Record<string, unknown> | null
  initialState?: string
  initialTerminalState?: string | null
  benchmark?: BenchmarkClientState | null
  teamName?: string
}

export function DeliberationFeed(props: DeliberationFeedProps) {
  return (
    <AIACanvas alwaysRenderSpheres matchContentHeight>
      <DeliberationScene {...props} />
    </AIACanvas>
  )
}

function DeliberationScene({
  sessionId,
  question,
  agentRoles,
  agentModels,
  modelByRole = {},
  defaultProvider = null,
  defaultModelId = null,
  initialEntries = [],
  initialConclusion = null,
  initialState = 'PENDING',
  initialTerminalState = null,
  benchmark = null,
  teamName = 'Deliberation'
}: DeliberationFeedProps) {
  const s = useDeliberationScene({
    sessionId,
    question,
    agentRoles,
    initialEntries,
    initialConclusion,
    initialState,
    initialTerminalState,
    defaultProvider: defaultProvider ?? null,
    teamName
  })

  // Group messages by round once, keyed on the messages array reference.
  // Each round's array is stable across renders where that round's content
  // hasn't changed, giving RoundStrip.memo a chance to skip.
  const entriesByRound = useMemo(() => {
    const map = new Map<number, typeof s.messages>()
    for (const m of s.messages) {
      const list = map.get(m.round)
      if (list) list.push(m)
      else map.set(m.round, [m])
    }
    return map
  }, [s.messages])

  // Judge call fires once, when: benchmark enabled AND baseline landed AND
  // terminal reached AND no judge stored yet AND user's key in memory. All
  // conditions checked inside the hook — safe to call unconditionally.
  useJudgeBenchmark({
    sessionId,
    question,
    benchmark,
    terminalReached: !!s.terminalState,
    conclusion: s.conclusion,
    defaultProvider: (defaultProvider ?? null) as RouteProvider | null,
    defaultModelId
  })

  return (
    <div>
      <div className='mx-auto w-full max-w-[640px] px-5 pb-16 pt-6'>
        <div className='mb-8 rounded-xl border border-border bg-card p-4'>
          <div className='mb-2 text-[9px] font-semibold uppercase tracking-[0.25em]'>Your Question</div>
          <p className='m-0 text-base leading-relaxed text-foreground/90'>{question}</p>
        </div>

        {(s.isInterrupted || s.isTerminalButEmpty) && (
          <div className='mb-6 rounded-lg border border-warning/20 bg-warning/5 p-4'>
            <div className='mb-1 text-sm font-medium text-warning-foreground'>Deliberation interrupted</div>
            <p className='mb-3 text-[13px] leading-relaxed text-warning-foreground/70'>
              This session was interrupted during {s.interruptedRoundLabel}.
              {s.rounds.length > 0 && (
                <>
                  {' '}
                  Round{s.rounds.length > 1 ? `s ${s.rounds.join(', ')}` : ` ${s.rounds[0]}`}{' '}
                  {s.rounds.length > 1 ? 'have' : 'has'} partial data.
                </>
              )}
            </p>
            <div className='flex gap-2'>
              <Button size='sm' variant='outline' onClick={() => window.location.reload()}>
                Resume Deliberation
              </Button>
              <NextLink
                variant='unstyled'
                href='/deliberate'
                className='inline-flex h-7 items-center rounded-md border border-border bg-background px-2 text-xs font-medium transition-colors hover:bg-accent/20'
              >
                Start Fresh
              </NextLink>
            </div>
          </div>
        )}

        {/* Rounds stack with a vertical connector between them — a single dashed
            line rendered via divide-y so adjacent strips feel like one continuous
            deliberation instead of isolated cards. */}
        <div className='flex flex-col'>
          {s.displayRounds.map((round, i) => {
            const roundEntries = entriesByRound.get(round) ?? []
            const streamingForRound = s.streamingMessage?.round === round ? s.streamingMessage : null
            return (
              <div key={round} className='flex flex-col'>
                {i > 0 && (
                  <div aria-hidden className='flex h-10 items-center justify-center'>
                    <div className='h-full w-px border-l border-dashed border-border' />
                  </div>
                )}
                <RoundStrip
                  round={round}
                  question={question}
                  agentRoles={agentRoles}
                  modelByRole={modelByRole}
                  entries={roundEntries}
                  streamingMessage={streamingForRound}
                  isLive={s.currentRoundNum === round && s.isLiveSession}
                  isRoundComplete={s.isRoundComplete(round)}
                />
              </div>
            )
          })}
        </div>

        {s.showLoading && (
          <div className='flex items-center justify-center gap-2.5 py-8 text-sm text-muted-foreground'>
            <span className='size-1.5 animate-pulse rounded-full bg-accent' />
            {s.loadingMessage}
          </div>
        )}

        {s.showConclusion && s.terminalState && !s.isTerminalButEmpty && (
          <div className='pb-24 pt-4'>
            <ConclusionPanel terminalState={s.terminalState} conclusion={s.conclusion} agentModels={agentModels} />
            <TranscriptActions
              input={{
                question,
                messages: s.messages,
                terminalState: s.terminalState,
                conclusion: s.conclusion,
                modelByRole
              }}
            />
            {benchmark && (
              <div className='mt-4 flex justify-center'>
                <NextLink
                  href={`/deliberation/${sessionId}/benchmark`}
                  variant='unstyled'
                  className='inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-accent'
                >
                  View benchmark comparison →
                </NextLink>
              </div>
            )}
          </div>
        )}

        <div ref={s.feedEndRef} />
      </div>
    </div>
  )
}
