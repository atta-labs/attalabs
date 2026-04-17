'use client'

import { useId } from 'react'
import { ModelIcon } from '@atta/ui'
import { AIAgent, type AgentName } from '@atta/ui/canvas'
import { useUserPreferences } from '@/lib/user-preferences-context'

interface AgentCardProps {
  agent: string
  content: string
  target?: string | null
  isLast?: boolean
  isStreaming?: boolean
  modelId?: string
}

export function AgentCard({ agent, content, target, isStreaming = false, modelId }: AgentCardProps) {
  const sphereId = useId()
  const { faceStyle } = useUserPreferences()

  return (
    <div className='flex gap-4'>
      <div className='flex shrink-0 flex-col items-center'>
        <div className='rounded-full'>
          <AIAgent
            id={sphereId}
            name={agent as AgentName}
            faceStyle={faceStyle}
            size='lg'
            state='speaking'
            showMatrix
            label={agent}
            labelPosition='bottom'
          />
        </div>
      </div>

      <div className='min-w-0 flex-1'>
        <div className='rounded-lg border border-border bg-card px-4 py-3.5'>
          <div className='mb-2 flex items-center gap-1.5'>
            <span className='text-[11px] font-medium text-foreground/70'>{agent}</span>
            {modelId && <ModelIcon model={modelId} size={10} type='mono' />}
          </div>
          {target && (
            <div className='mb-2'>
              <span className='text-[10px] italic text-muted-foreground/50'>→ replying to {target}</span>
            </div>
          )}
          <p className='m-0 text-sm leading-relaxed text-muted-foreground'>
            {content}
            {isStreaming && <span className='ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-muted-foreground' />}
          </p>
        </div>
      </div>
    </div>
  )
}
