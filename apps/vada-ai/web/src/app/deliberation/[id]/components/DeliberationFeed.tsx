'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, useToastContext } from '@atta/ui'
import { NextLink } from '@atta/ui/lib/next-link'
import { AIACanvas } from '@atta/ui/canvas'
import { Download, Copy } from 'lucide-react'
import { RoundSection } from './RoundSection'
import { ConclusionPanel } from './ConclusionPanel'
import { useDeliberation } from './useDeliberation'
import { ROUND_TITLES } from './agent-theme'
import { copyTranscriptToClipboard, downloadTranscript } from './transcript-export'
import { PRESETS } from '@/schemas'

interface DeliberationFeedProps {
  sessionId: string
  question: string
  agentRoles: string[]
  agentModels?: Record<string, { provider: string; modelId: string }>
  initialEntries?: Array<{ agent: string; content: string; round: number }>
  initialConclusion?: Record<string, unknown> | null
  initialState?: string
}

// ── Outer wrapper — AIACanvas provides context for AIASphere in AgentCard ──
export function DeliberationFeed(props: DeliberationFeedProps) {
  return (
    <AIACanvas alwaysRenderSpheres matchContentHeight className='relative w-full'>
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

  const teamName =
    PRESETS.find((p) => p.agents.length === agentRoles.length && p.agents.every((a) => agentRoles.includes(a.role)))
      ?.name ?? 'Deliberation'

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
  // Scoped to live streaming only. Past rounds are collapsed-by-default and
  // stable; auto-scrolling past them while the user is reading was jittery.
  const feedEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (streamingMessage) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [streamingMessage?.content])

  // Scroll to conclusion once when it arrives.
  const scrolledToConclusionRef = useRef(false)
  useEffect(() => {
    if (showConclusion && !scrolledToConclusionRef.current) {
      scrolledToConclusionRef.current = true
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [showConclusion])

  // Figure out which round the interruption happened in
  const interruptedRoundLabel = initialState?.replace('_', ' ').toLowerCase() ?? 'unknown state'

  return (
    <div>
      {/* Error banner */}
      {streamError && (
        <div className='fixed inset-x-0 top-14 z-50 mx-auto max-w-2xl px-4'>
          <div className='flex items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 shadow-lg'>
            <p className='text-sm text-destructive'>{streamError}</p>
            <NextLink variant='destructive' href='/deliberate' className='mt-0.5 shrink-0 text-sm'>
              Back
            </NextLink>
          </div>
        </div>
      )}

      {/* Main feed */}
      <div className='mx-auto w-full max-w-[640px] px-5 pb-16 pt-6'>
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
              <Button
                size='sm'
                variant='outline'
                onClick={() => window.location.reload()}
                className='text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/15'
              >
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
              teamName={teamName}
              agentModels={agentModels}
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
            <ConclusionPanel terminalState={terminalState} conclusion={conclusion} agentModels={agentModels} />
            <TranscriptActions
              input={{
                question,
                messages,
                terminalState,
                conclusion
              }}
            />
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={feedEndRef} />
      </div>
    </div>
  )
}

// ── TranscriptActions ────────────────────────────────────────────────────────
// Export + copy + new-deliberation triad. Rendered under the conclusion card.

function TranscriptActions({ input }: { input: Parameters<typeof downloadTranscript>[0] }) {
  const { successToast, errorToast } = useToastContext()
  const [copying, setCopying] = useState(false)

  const handleCopy = async () => {
    setCopying(true)
    try {
      await copyTranscriptToClipboard(input)
      successToast('Copied', 'Full transcript on your clipboard.')
    } catch (e) {
      errorToast('Copy failed', e instanceof Error ? e.message : 'Try download instead.')
    } finally {
      setCopying(false)
    }
  }

  const handleDownload = () => {
    try {
      downloadTranscript(input)
      successToast('Downloaded', 'Transcript saved as markdown.')
    } catch (e) {
      errorToast('Download failed', e instanceof Error ? e.message : 'Try again.')
    }
  }

  return (
    <div className='mt-4 flex flex-wrap gap-2.5'>
      <Button type='button' variant='outline' onClick={handleCopy} disabled={copying} className='flex-1'>
        <Copy className='mr-1.5 size-3.5' />
        {copying ? 'Copying…' : 'Copy transcript'}
      </Button>
      <Button type='button' variant='outline' onClick={handleDownload} className='flex-1'>
        <Download className='mr-1.5 size-3.5' />
        Download .md
      </Button>
      <NextLink
        variant='unstyled'
        href='/deliberate'
        className='flex-1 rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90'
      >
        New deliberation
      </NextLink>
    </div>
  )
}
