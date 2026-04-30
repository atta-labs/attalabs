'use client'

import type { NodeProps } from '@xyflow/react'
import type { RoundLabelData } from '../planToVisualNodes'

export function RoundLabel({ data }: NodeProps) {
  const { label } = data as RoundLabelData

  return (
    <div className='flex items-center justify-center rounded-full bg-muted border border-border/50 px-3 py-1 pointer-events-none select-none'>
      <span className='font-mono text-[10px] text-muted-foreground uppercase tracking-widest'>{label}</span>
    </div>
  )
}
