'use client'

// Presentational only. State + effects + scroll handling + error toasting
// all live in useDeliberationScene. TranscriptActions uses its own hook.

import { Button } from '@atta/ui'
import { AIACanvas } from '@atta/ui/canvas'
import { NextLink } from '@atta/ui/lib/next-link'
import { ConclusionPanel } from './ConclusionPanel'
import { ROUND_TITLES } from './agent-theme'
import { RoundSection } from './RoundSection'
import { TranscriptActions } from './TranscriptActions'
import { useDeliberationScene } from './useDeliberationScene'

interface DeliberationFeedProps {
  sessionId: string
  question: string
  agentRoles: string[]
  agentModels?: Record<string, { provider: string; modelId: string }>
  initialEntries?: Array<{ agent: string; content: string; round: number }>
  initialConclusion?: Record<string, unknown> | null
  initialState?: string
  initialTerminalState?: string | null
}

// ── Outer wrapper — AIACanvas provides context for AIASphere in AgentCard ──
// Pause the rAF loop when the session is already terminal on load. A completed
// deliberation is a read-only page; the animation just burns CPU and causes
// visible scroll jank on long transcripts (matchContentHeight canvases can be
// several viewports tall). Particle state is preserved, so if the user later
// triggers something, resuming is free.
export function DeliberationFeed(props: DeliberationFeedProps) {
  const isAlreadyTerminal = props.initialState === 'TERMINAL'
  return (
    <AIACanvas alwaysRenderSpheres matchContentHeight paused={isAlreadyTerminal} className='relative w-full'>
      <DeliberationScene {...props} />
    </AIACanvas>
  )
}

function DeliberationScene({
  sessionId,
  question,
  agentRoles,
  agentModels,
  initialEntries = [],
  initialConclusion = null,
  initialState = 'PENDING',
  initialTerminalState = null
}: DeliberationFeedProps) {
  const s = useDeliberationScene({
    sessionId,
    question,
    agentRoles,
    initialEntries,
    initialConclusion,
    initialState,
    initialTerminalState
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

        {s.rounds.map((round) => {
          const roundMessages = s.messages.filter((m) => m.round === round && m.content.trim().length > 0)
          const isCurrentRound = s.currentRoundNum === round
          const roundStreamMsg = isCurrentRound && s.streamingMessage?.round === round ? s.streamingMessage : null
          return (
            <RoundSection
              key={round}
              round={round}
              entries={roundMessages}
              streamingMessage={roundStreamMsg}
              isLive={isCurrentRound}
              isRoundComplete={s.isRoundComplete(round)}
              expectedAgentCount={agentRoles.length}
              teamName={s.teamName}
              agentModels={agentModels}
            />
          )
        })}

        {s.currentRoundNum && !s.rounds.includes(s.currentRoundNum) && s.isLiveSession && (
          <div className='mb-6'>
            <div className='mb-4 flex items-center gap-3 px-1'>
              <div className='h-px flex-1 bg-border' />
              <span className='whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.35em]'>
                Round {s.currentRoundNum} — {ROUND_TITLES[s.currentRoundNum] ?? ''}
              </span>
              <div className='h-px flex-1 bg-border' />
            </div>
            <div className='flex items-center justify-center gap-2.5 py-8 text-sm text-muted-foreground'>
              <span className='size-1.5 animate-pulse rounded-full bg-muted-foreground' />
              {s.currentRoundNum === 1
                ? 'Agents are forming their positions…'
                : `Agents are reading Round ${s.currentRoundNum - 1}…`}
            </div>
          </div>
        )}

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
                conclusion: s.conclusion
              }}
            />
          </div>
        )}

        <div ref={s.feedEndRef} />
      </div>
    </div>
  )
}
