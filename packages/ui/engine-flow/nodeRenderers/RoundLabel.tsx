'use client'

import type { NodeProps } from '@xyflow/react'
import { cn } from '@atta/ui/lib/utils'
import type { RoundLabelData } from '../types'

export function RoundLabel({ data }: NodeProps) {
  const { label, isActive } = data as RoundLabelData

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full border px-3 py-1',
        'pointer-events-none select-none transition-all duration-300',
        isActive ? 'bg-primary/10 border-primary/40' : 'bg-muted border-border/50'
      )}
    >
      <span
        className={cn(
          'font-mono text-[10px] uppercase tracking-widest transition-colors duration-300',
          isActive ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
    </div>
  )
}
