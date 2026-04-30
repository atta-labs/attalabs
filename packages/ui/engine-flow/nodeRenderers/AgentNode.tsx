'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@atta/ui/lib/utils'
import type { AgentNodeData } from '../planToVisualNodes'

export function AgentNode({ data, selected }: NodeProps) {
  const { label, role, roundIndex, visualState, streamingContent } = data as AgentNodeData

  const roleLabel =
    role === 'audit'
      ? 'auditor'
      : role === 'solo'
        ? 'reviewer'
        : role === 'round'
          ? roundIndex !== undefined
            ? `round ${roundIndex + 1}`
            : 'round'
          : role

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-card text-card-foreground px-3 py-2.5',
        'transition-all duration-300 min-w-[180px]',
        visualState === 'idle' && 'border-border opacity-80',
        visualState === 'queued' && 'border-border/50 opacity-50',
        visualState === 'running' && 'border-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]',
        (visualState === 'streaming' || visualState === 'complete') &&
          'border-success/50 shadow-[0_0_8px_hsl(var(--success)/0.15)]',
        visualState === 'revised' && 'border-warning/60',
        selected && 'ring-1 ring-ring'
      )}
    >
      <Handle type='target' position={Position.Top} className='!size-2 !bg-muted-foreground !border-border' />

      <div className='font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-wide'>{roleLabel}</div>

      <div className='font-sans text-sm font-medium text-foreground leading-snug'>{label}</div>

      {(visualState === 'running' || visualState === 'streaming') && (
        <div className='flex gap-1 mt-2 items-center'>
          <span className='inline-block size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]' />
          <span className='inline-block size-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]' />
          <span className='inline-block size-1.5 rounded-full bg-primary animate-bounce' />
        </div>
      )}

      {streamingContent && visualState === 'streaming' && (
        <div className='mt-1.5 text-[10px] text-muted-foreground line-clamp-2 font-mono leading-relaxed'>
          {streamingContent}
        </div>
      )}

      {visualState === 'complete' && (
        <div className='mt-1.5 flex items-center gap-1'>
          <span className='size-1.5 rounded-full bg-success' />
          <span className='text-[10px] text-muted-foreground font-mono'>done</span>
        </div>
      )}

      {visualState === 'revised' && (
        <div className='mt-1.5 flex items-center gap-1'>
          <span className='size-1.5 rounded-full bg-warning' />
          <span className='text-[10px] text-muted-foreground font-mono'>revised</span>
        </div>
      )}

      <Handle type='source' position={Position.Bottom} className='!size-2 !bg-muted-foreground !border-border' />
    </div>
  )
}
