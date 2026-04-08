'use client'

import { SphereAvatar } from '@atta/ui/canvas'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

// Agent role → hex color (matches AgentBadge.tsx exactly)
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
  const color = AGENT_COLORS[message.agentRole] ?? '#C8A84B'
  const sphereState = isStreaming ? 'speaking' : 'complete'
  const roleLabel = message.agentRole.replace('_', ' ')

  return (
    <div
      data-agent={message.agentRole}
      className='rounded-xl border border-border bg-card p-4 transition-shadow duration-300'
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Header */}
      <div className='mb-3 flex items-center gap-2.5'>
        <SphereAvatar state={sphereState} color={color} size='xs' />
        <div className='flex min-w-0 flex-col'>
          <span className='text-sm font-semibold leading-tight' style={{ color }}>
            {message.agent}
          </span>
          <span className='mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground'>{roleLabel}</span>
        </div>
      </div>

      {/* Reply badge */}
      {message.replyTarget && (
        <button
          type='button'
          onClick={() => onReplyClick?.(message.replyTarget!)}
          className='mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition-opacity hover:opacity-70'
          style={{
            backgroundColor: `${AGENT_COLORS[nameToRole(message.replyTarget)] ?? color}1A`,
            color: AGENT_COLORS[nameToRole(message.replyTarget)] ?? color
          }}
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
