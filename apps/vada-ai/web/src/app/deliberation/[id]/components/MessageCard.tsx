'use client'

import { SphereAvatar } from '@atta/ui/canvas'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

// Agent role → brand color (single source of truth).
// Set as --agent-color CSS variable on each card; all rendering uses var(--agent-color).
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
  onReplyClick?: (targetAgentName: string) => void
}

export function MessageCard({ message, isStreaming = false, onReplyClick }: MessageCardProps) {
  const agentColor = AGENT_COLORS[message.agentRole] ?? 'var(--accent)'
  const replyColor = message.replyTarget
    ? (AGENT_COLORS[nameToRole(message.replyTarget)] ?? 'var(--muted-foreground)')
    : 'var(--muted-foreground)'
  const sphereState = isStreaming ? 'speaking' : 'complete'
  const roleLabel = message.agentRole.replace('_', ' ')

  return (
    // --agent-color scopes this agent's brand color to the card
    <div
      data-agent={message.agentRole}
      className='rounded-xl border border-border bg-card p-4 transition-shadow duration-300'
      style={
        {
          '--agent-color': agentColor,
          borderLeft: '3px solid var(--agent-color)'
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div className='mb-3 flex items-center gap-2.5'>
        <SphereAvatar state={sphereState} color='var(--agent-color)' size='xs' />
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm font-semibold leading-tight' style={{ color: 'var(--agent-color)' }}>
            {message.agent}
          </span>
          <span className='mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground'>{roleLabel}</span>
        </div>
      </div>

      {/* Reply badge — uses target agent's color scoped as --reply-color */}
      {message.replyTarget && (
        <button
          type='button'
          onClick={() => onReplyClick?.(message.replyTarget!)}
          className='mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-opacity hover:opacity-70'
          style={
            {
              '--reply-color': replyColor,
              backgroundColor: 'color-mix(in srgb, var(--reply-color) 10%, transparent)',
              color: 'var(--reply-color)'
            } as React.CSSProperties
          }
        >
          <span>↩</span>
          <span>Replying to {message.replyTarget}</span>
        </button>
      )}

      {/* Body */}
      <p className='text-sm leading-[1.7] text-foreground/90'>
        {message.content}
        {isStreaming && (
          <span className='ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-current align-middle opacity-70' />
        )}
      </p>
    </div>
  )
}
