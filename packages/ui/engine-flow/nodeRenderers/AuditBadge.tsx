'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@atta/ui/lib/utils'
import type { AuditNodeData } from '../types'

export function AuditBadge({ data, selected }: NodeProps) {
  const { label, visualState } = data as AuditNodeData

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 rounded-md border bg-card px-3 py-2',
        'transition-all duration-300',
        visualState === 'idle' && 'border-border opacity-70',
        visualState === 'queued' && 'border-border/50 opacity-40',
        visualState === 'running' && 'border-warning/50 shadow-[0_0_8px_hsl(var(--warning)/0.2)]',
        (visualState === 'streaming' || visualState === 'complete') && 'border-success/50',
        selected && 'ring-1 ring-ring'
      )}
    >
      <Handle type='target' position={Position.Left} className='!size-1.5 !bg-muted-foreground !border-border' />
      <span className='font-mono text-[10px] text-warning uppercase tracking-widest shrink-0'>audit</span>
      <span className='font-sans text-xs text-muted-foreground leading-none truncate'>{label}</span>
      <Handle type='source' position={Position.Right} className='!size-1.5 !bg-muted-foreground !border-border' />
    </div>
  )
}
