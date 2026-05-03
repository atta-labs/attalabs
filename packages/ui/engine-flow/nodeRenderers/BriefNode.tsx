'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@atta/ui/lib/utils'
import type { BriefNodeData } from '../types'

export function BriefNode({ data, selected }: NodeProps) {
  const { label } = data as BriefNodeData

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        'rounded-full border border-border bg-muted',
        'px-4 py-2',
        'transition-all duration-300',
        selected && 'ring-1 ring-ring'
      )}
    >
      <span className='font-mono text-[10px] text-muted-foreground uppercase tracking-widest'>{label}</span>
      <Handle type='source' position={Position.Right} className='!size-2 !bg-muted-foreground !border-border' />
    </div>
  )
}
