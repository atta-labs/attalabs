'use client'

import { AIASphere } from '@atta/ui/canvas'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

// Agent role → brand color (single source of truth).
// Set as --agent-color CSS variable on the card root; all rendering uses var(--agent-color).
export const AGENT_COLORS: Record<string, string> = {
  strategist: '#4A9EDB',
  critic: '#DB4A4A',
  devils_advocate: '#9B59B6',
  synthesizer: '#C8A84B',
  researcher: '#2ECC71',
  operator: '#E67E22'
}

// Display name → role key
function nameToRole(name: string): string {
  const map: Record<string, string> = {
    Strategist: 'strategist',
    Critic: 'critic',
    "Devil's Advocate": 'devils_advocate',
    Synthesizer: 'synthesizer',
    Researcher: 'researcher',
    Operator: 'operator'
  }
  return map[name] ?? 'strategist'
}

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
  const replyColor = message.replyTarget
    ? (AGENT_COLORS[nameToRole(message.replyTarget)] ?? 'var(--muted-foreground)')
    : 'var(--muted-foreground)'
  const sphereState = isStreaming ? 'speaking' : 'complete'
  const roleLabel = message.agentRole.replace('_', ' ')

  const sphere = (
    <div className='flex justify-center py-2'>
      <AIASphere
        id={'id' in message ? message.id : `streaming-${message.agentRole}`}
        state={sphereState}
        color={agentColor}
        size='md'
        label={message.agent}
        labelPosition={spherePosition === 'bottom' ? 'bottom' : 'top'}
        showMatrix={isStreaming}
      />
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
      <p className='mb-2 text-[10px] uppercase tracking-wider text-muted-foreground'>{roleLabel}</p>

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
          <div className='rounded-xl border border-border p-4 transition-shadow duration-300'>{content}</div>
        </>
      ) : (
        <>
          {content}
          {sphere}
        </>
      )}
    </div>
  )
}
