'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@atta/ui/lib/utils'
import type { MechanicalNodeData } from '../types'

export function MechanicalNode({ data, selected }: NodeProps) {
  const { label, action, visualState } = data as MechanicalNodeData

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 rounded-md border bg-muted px-3 py-2',
        'transition-all duration-300',
        visualState === 'idle' && 'border-border opacity-70',
        visualState === 'queued' && 'border-border/50 opacity-40',
        visualState === 'running' && 'border-primary/50 shadow-[0_0_8px_hsl(var(--primary)/0.2)]',
        (visualState === 'streaming' || visualState === 'complete') && 'border-success/50',
        selected && 'ring-1 ring-ring'
      )}
    >
      <Handle type='target' position={Position.Left} className='!size-1.5 !bg-muted-foreground !border-border' />
      <span className='font-mono text-[10px] text-muted-foreground uppercase tracking-widest shrink-0'>{action}</span>
      <span className='font-sans text-xs text-foreground leading-none truncate'>{label}</span>
      <Handle type='source' position={Position.Right} className='!size-1.5 !bg-muted-foreground !border-border' />
    </div>
  )
}
