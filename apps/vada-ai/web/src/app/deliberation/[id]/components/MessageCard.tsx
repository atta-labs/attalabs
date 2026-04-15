'use client'

import { AIASphere, AGENT_COLOR_BY_ROLE } from '@atta/ui/canvas'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

// Re-export for RoundView which imports AGENT_COLORS from here.
export const AGENT_COLORS = AGENT_COLOR_BY_ROLE

interface MessageCardProps {
  message: DeliberationMessage | StreamingMessage
  isStreaming?: boolean
  // 'bottom' = sphere at bottom edge (top-row cards)
  // 'top'    = sphere at top edge (bottom-row cards)
  spherePosition?: 'top' | 'bottom'
  onReplyClick?: (targetAgentName: string) => void
}

export function MessageCard({
  message,
  isStreaming = false,
  spherePosition = 'bottom',
  onReplyClick
}: MessageCardProps) {
  const agentColor = AGENT_COLORS[message.agentRole] ?? 'var(--accent)'
  const sphereState = isStreaming ? 'speaking' : 'complete'
  const roleLabel = message.agentRole.replace('_', ' ')

  const sphere = (
    <div className='flex justify-center py-2'>
      <AIASphere
        id={'id' in message ? message.id : `streaming-${message.agentRole}`}
        state={sphereState}
        color={agentColor}
        size='lg'
        showMatrix
      >
        {/* Ping ring — expands outward while agent is speaking */}
        {isStreaming && (
          <span className='absolute inset-0 animate-ping rounded-full bg-[var(--agent-color)] opacity-20' />
        )}
        {/* Visible circle — transparent bg so canvas matrix rain shows through */}
        <span
          className={`absolute inset-0 rounded-full border border-[var(--agent-color)] transition-all duration-300
            ${isStreaming ? 'shadow-[0_0_18px_color-mix(in_srgb,var(--agent-color)_40%,transparent)]' : ''}
            ${sphereState === 'complete' ? 'opacity-75' : 'opacity-100'}
          `}
        />
      </AIASphere>
    </div>
  )

  const content = (
    <>
      {/* Reply badge */}
      {message.replyTarget && (
        <button
          type='button'
          onClick={() => onReplyClick?.(message.replyTarget!)}
          className='mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-opacity hover:opacity-70'
        >
          <span>↩</span>
          <span>Replying to {message.replyTarget}</span>
        </button>
      )}

      {/* Role label */}
      <p className='mb-2 text-[10px] uppercase tracking-wider '>{roleLabel}</p>

      {/* Body */}
      <p className='text-sm leading-[1.7] text-foreground/90'>
        {message.content}
        {isStreaming && (
          <span className='ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current align-middle opacity-70' />
        )}
      </p>
    </>
  )

  return (
    <div data-agent={message.agentRole} className='flex flex-col rounded-xl p-4 transition-shadow duration-300'>
      {spherePosition === 'top' ? (
        <>
          {sphere}
          <div className='rounded-xl border border-border bg-card p-4 transition-shadow duration-300 h-64 overflow-y-auto'>
            {content}
          </div>
        </>
      ) : (
        <>
          <div className='rounded-xl border border-border bg-card p-4 transition-shadow duration-300 h-64 overflow-y-auto'>
            {content}
          </div>
          {sphere}
        </>
      )}
    </div>
  )
}
