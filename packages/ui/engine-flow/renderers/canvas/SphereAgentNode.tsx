'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AIASphere } from '@atta/ui/canvas'
import type { SphereState } from '@atta/ui/canvas'
import type { AgentNodeData } from '../../types'

// Agent color palette — cycles by colorIndex
const PALETTE = [
  'hsl(119 21% 45%)',
  'hsl(0 49% 57%)',
  'hsl(278 35% 63%)',
  'hsl(43 52% 54%)',
  'hsl(207 32% 52%)',
  'hsl(30 32% 52%)'
] as const

function toSphereState(visualState: string): SphereState {
  if (visualState === 'running' || visualState === 'streaming') return 'speaking'
  if (visualState === 'complete' || visualState === 'revised') return 'complete'
  return 'idle'
}

export function SphereAgentNode({ id, data }: NodeProps) {
  const { label, visualState = 'idle', colorIndex = 0 } = data as AgentNodeData
  const color = PALETTE[colorIndex % PALETTE.length] ?? PALETTE[0]
  const sphereState = toSphereState(visualState as string)

  return (
    <div className='relative flex flex-col items-center justify-center w-full h-full gap-1.5 overflow-visible'>
      <Handle type='target' position={Position.Left} className='!size-2 !bg-muted-foreground !border-border' />
      <AIASphere
        id={`flow-agent-${id}`}
        state={sphereState}
        color={color}
        size='sm'
        showMatrix={sphereState !== 'idle'}
        solidBg
        bgOpacity={0.7}
      />
      <span className='font-mono text-[9px] text-muted-foreground uppercase tracking-wide text-center leading-tight max-w-[160px] truncate'>
        {label}
      </span>
      <Handle type='source' position={Position.Right} className='!size-2 !bg-muted-foreground !border-border' />
    </div>
  )
}
