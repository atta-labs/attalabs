'use client'

// Pure presentation for one round. All state + async handlers live in
// useRoundStrip; this file only renders.
//
// Layout:
//   Top: round title + status badge + copy/download icons + model pills +
//        row of AIAgent faces (one per agent; selected face has matrix on).
//   Bottom: ONE card with the selected speaker's message (current speaker
//           during live streaming; last-done agent otherwise). Card slides
//           on selection change. Markdown renders through the shared
//           MARKDOWN_COMPONENTS map so round slots and the conclusion card
//           style identically.

import { Button, ModelIcon } from '@atta/ui'
import { VadaAgent as AIAgent, type AgentName } from '@vada/agents'
import { Copy, Download } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { memo, type CSSProperties, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AGENT_COLOR_BY_ROLE } from './agent-theme'
import { MARKDOWN_COMPONENTS } from './markdown-components'
import { sphereIdFor, useRoundStrip } from './useRoundStrip'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

interface RoundStripProps {
  round: number
  question: string
  agentRoles: string[]
  modelByRole?: Record<string, { provider: string; modelId: string }>
  entries: DeliberationMessage[]
  streamingMessage: StreamingMessage | null
  isLive: boolean
  isRoundComplete: boolean
}

const AGENT_NAME_BY_ROLE: Record<string, AgentName> = {
  strategist: 'Strategist',
  critic: 'Critic',
  devils_advocate: "Devil's Advocate",
  synthesizer: 'Synthesizer',
  researcher: 'Researcher',
  operator: 'Operator'
}

function toAgentName(role: string): AgentName {
  return AGENT_NAME_BY_ROLE[role] ?? (role as AgentName)
}

// Memoized so ReactMarkdown doesn't re-parse on parent re-renders when the
// message text hasn't changed. The cursor blink is the only live update here.
const AgentMessageText = memo(function AgentMessageText({
  message,
  isSpeaking
}: {
  message: string
  isSpeaking: boolean
}) {
  return (
    <div className='text-[13px] leading-relaxed text-foreground/90'>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {message}
      </ReactMarkdown>
      {isSpeaking && <span className='ml-0.5 inline-block h-3 w-px animate-pulse bg-foreground align-middle' />}
    </div>
  )
})

export const RoundStrip = memo(function RoundStrip({
  round,
  question,
  agentRoles,
  modelByRole = {},
  entries,
  streamingMessage,
  isLive,
  isRoundComplete
}: RoundStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const {
    agentStates,
    currentSpeaker,
    displaySpeaker,
    displayState,
    setManualSelection,
    roundTitle,
    statusBadge,
    roundModels,
    handleCopy,
    handleDownload
  } = useRoundStrip({
    round,
    question,
    agentRoles,
    modelByRole,
    entries,
    streamingMessage,
    isLive,
    isRoundComplete
  })

  useEffect(() => {
    if (displayState?.status === 'speaking' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayState?.message, displayState?.status])

  return (
    <section data-round={round} className='space-y-4 rounded-lg border border-border bg-card/40 p-4'>
      {/* Header: left column (title + status/actions stacked) + sphere row.
          Layout rule: parent defines spacing (space-y on left column, gap
          on the flex row). Children use self-padding for their own content
          breathing room only — never margin to push siblings. */}
      <header className='flex flex-wrap items-center gap-4'>
        {/* Left column: h-12 matches the sm sphere row (48px). flex-col +
            justify-center stacks title and status/actions inside that
            height so the whole header is one tight 48px band. */}
        <div className='flex h-12 min-w-[180px] flex-1 flex-col justify-center gap-1'>
          <div className='font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground'>
            Round {round} — {roundTitle}
          </div>
          <div className='flex items-center gap-1'>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              className='size-6'
              onClick={handleCopy}
              aria-label={`Copy round ${round} transcript`}
              disabled={entries.length === 0}
            >
              <Copy className='size-3' />
            </Button>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              className='size-6'
              onClick={handleDownload}
              aria-label={`Download round ${round} transcript`}
              disabled={entries.length === 0}
            >
              <Download className='size-3' />
            </Button>
            {roundModels.map((m) => (
              <span
                key={`${m.provider}:${m.modelId}`}
                className='inline-flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5'
                title={`${m.provider} · ${m.label}`}
              >
                <ModelIcon model={m.modelId} size={12} type='avatar' />
                <span className='font-mono text-[9px] tracking-normal text-foreground/80'>{m.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Face row: click a done agent to view their message. Only the
            selected sphere animates with matrix; others show face only. */}
        <div className='flex items-center gap-3'>
          {agentStates.map((s) => {
            const isSelected = s.role === displaySpeaker
            const canClick = !currentSpeaker && s.status === 'done'
            const sphereState = isSelected ? 'speaking' : s.status === 'done' ? 'complete' : 'idle'
            return (
              <AIAgent
                key={s.role}
                id={sphereIdFor(round, s.role)}
                name={toAgentName(s.role)}
                size='sm'
                state={sphereState}
                showMatrix={isSelected}
                faceOpacity={isSelected ? 1 : 0.45}
                matrixOpacity={isSelected ? 1 : 0.5}
                noLabel
                particleCount={30}
                {...(canClick ? { onClick: () => setManualSelection(s.role) } : {})}
              />
            )
          })}
        </div>
      </header>

      {/* Selected speaker card — sliding transition on selection change */}
      <div className='relative h-[320px] overflow-hidden'>
        <AnimatePresence mode='wait' initial={false}>
          {displayState ? (
            <motion.div
              ref={scrollRef}
              key={displayState.role}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className='h-full overflow-y-auto rounded border-l-2 border-l-[var(--agent-color)] bg-card/60 px-4 py-3'
              style={{ '--agent-color': AGENT_COLOR_BY_ROLE[displayState.role] ?? 'var(--border)' } as CSSProperties}
            >
              <div className='mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--agent-color)]'>
                {toAgentName(displayState.role)}
                {displayState.status === 'speaking' && (
                  <span className='ml-2 normal-case tracking-normal text-muted-foreground'>· speaking</span>
                )}
              </div>
              <AgentMessageText message={displayState.message} isSpeaking={displayState.status === 'speaking'} />
            </motion.div>
          ) : (
            <motion.div
              key='empty'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='flex h-full items-center justify-center text-sm italic text-muted-foreground'
            >
              Agents are getting ready…
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
})
