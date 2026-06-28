'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@atta/ui/lib/utils'
import { VadaAgent } from '@/components/agents/VadaAgent'
import type { AgentNodeData } from '@atta/ui/engine-flow'

export function AgentFlowNode({ data }: NodeProps) {
  const { agentName, visualState, model } = data as AgentNodeData

  const sphereState =
    visualState === 'running' || visualState === 'streaming'
      ? 'speaking'
      : visualState === 'complete' || visualState === 'revised'
        ? 'complete'
        : 'idle'

  const showMatrix = visualState === 'running' || visualState === 'streaming'

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5',
        'transition-all duration-300',
        visualState === 'idle' && 'border-border opacity-80',
        visualState === 'queued' && 'border-border/50 opacity-50',
        visualState === 'running' && 'border-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]',
        (visualState === 'streaming' || visualState === 'complete') &&
          'border-success/50 shadow-[0_0_8px_hsl(var(--success)/0.15)]',
        visualState === 'revised' && 'border-warning/60'
      )}
    >
      <Handle type='target' position={Position.Left} className='!size-2 !bg-muted-foreground !border-border' />

      <VadaAgent
        id={`flow-${agentName}`}
        name={agentName}
        model={model}
        userConfigured={true}
        state={sphereState}
        size='sm'
        visible
        showMatrix={showMatrix}
        label={undefined}
      />

      <div className='flex-1 min-w-0'>
        <div className='font-sans text-xs font-medium text-foreground truncate'>{agentName}</div>
        {(visualState === 'running' || visualState === 'streaming') && (
          <div className='flex gap-0.5 mt-1'>
            <span className='inline-block size-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]' />
            <span className='inline-block size-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]' />
            <span className='inline-block size-1 rounded-full bg-primary animate-bounce' />
          </div>
        )}
        {visualState === 'complete' && (
          <div className='flex items-center gap-1 mt-1'>
            <span className='size-1 rounded-full bg-success' />
            <span className='font-mono text-[9px] text-muted-foreground'>done</span>
          </div>
        )}
        {visualState === 'revised' && (
          <div className='flex items-center gap-1 mt-1'>
            <span className='size-1 rounded-full bg-warning' />
            <span className='font-mono text-[9px] text-muted-foreground'>revised</span>
          </div>
        )}
      </div>

      <Handle type='source' position={Position.Right} className='!size-2 !bg-muted-foreground !border-border' />
    </div>
  )
}
