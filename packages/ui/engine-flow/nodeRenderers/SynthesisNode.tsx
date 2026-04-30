'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@atta/ui/lib/utils'
import type { SynthesisNodeData } from '../planToVisualNodes'

export function SynthesisNode({ data, selected }: NodeProps) {
  const { label, visualState, streamingContent } = data as SynthesisNodeData

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-card text-card-foreground px-4 py-3',
        'transition-all duration-300 min-w-[200px]',
        visualState === 'idle' && 'border-primary/30 opacity-80',
        visualState === 'queued' && 'border-primary/20 opacity-50',
        visualState === 'running' && 'border-primary shadow-[0_0_16px_hsl(var(--primary)/0.35)]',
        (visualState === 'streaming' || visualState === 'complete') &&
          'border-success shadow-[0_0_12px_hsl(var(--success)/0.25)]',
        visualState === 'revised' && 'border-warning',
        selected && 'ring-1 ring-ring'
      )}
    >
      <Handle type='target' position={Position.Top} className='!size-2.5 !bg-primary !border-primary' />

      <div className='font-mono text-[10px] text-primary/70 mb-1 uppercase tracking-widest'>synthesis</div>

      <div className='font-serif text-base font-medium text-foreground leading-snug'>{label}</div>

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
        <div className='mt-1.5 flex items-center gap-1.5'>
          <span className='size-2 rounded-full bg-success' />
          <span className='text-[10px] text-success font-mono font-medium'>complete</span>
        </div>
      )}

      <Handle type='source' position={Position.Bottom} className='!size-2.5 !bg-primary !border-primary' />
    </div>
  )
}
