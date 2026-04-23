'use client'

import { ModelIcon } from '@atta/ui'
import { VadaAgent as AIAgent, AGENT_BY_ROLE, type AgentName } from '@atta/agents'
import type { DeliberationMessage, StreamingMessage } from './useDeliberation'

interface MessageCardProps {
  message: DeliberationMessage | StreamingMessage
  isStreaming?: boolean
  // 'bottom' = sphere at bottom edge (top-row cards)
  // 'top'    = sphere at top edge (bottom-row cards)
  spherePosition?: 'top' | 'bottom'
  onReplyClick?: (targetAgentName: string) => void
  modelId?: string
}

export function MessageCard({
  message,
  isStreaming = false,
  spherePosition = 'bottom',
  onReplyClick,
  modelId
}: MessageCardProps) {
  const agentName = (AGENT_BY_ROLE[message.agentRole]?.name ?? message.agentRole) as AgentName
  const sphereState = isStreaming ? 'speaking' : 'complete'
  const roleLabel = message.agentRole.replace('_', ' ')

  const sphere = (
    <div className='flex justify-center py-2'>
      <AIAgent
        id={'id' in message ? message.id : `streaming-${message.agentRole}`}
        name={agentName}
        faceStyle='reductive'
        state={sphereState}
        size='lg'
        showMatrix
        noLabel
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
      </AIAgent>
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
      <div className='mb-2 flex items-center gap-1.5'>
        <p className='text-[10px] uppercase tracking-wider '>{roleLabel}</p>
        {modelId && <ModelIcon model={modelId} size={10} type='mono' />}
      </div>

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
