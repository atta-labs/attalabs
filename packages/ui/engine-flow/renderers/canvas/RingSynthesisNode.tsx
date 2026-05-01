'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AIASphere } from '@atta/ui/canvas'
import type { SphereState } from '@atta/ui/canvas'
import type { SynthesisNodeData } from '../../types'

const SYNTHESIS_COLOR = 'hsl(43 52% 54%)' // gold — canonical synthesis color

function toSphereState(visualState: string): SphereState {
  if (visualState === 'running' || visualState === 'streaming') return 'speaking'
  if (visualState === 'complete' || visualState === 'revised') return 'complete'
  return 'idle'
}

export function RingSynthesisNode({ id, data }: NodeProps) {
  const { label, visualState = 'idle' } = data as SynthesisNodeData
  const sphereState = toSphereState(visualState as string)

  return (
    <div className='relative flex flex-col items-center justify-center w-full h-full gap-1.5 overflow-visible'>
      <Handle type='target' position={Position.Left} className='!size-2.5 !bg-primary !border-primary' />
      <AIASphere
        id={`flow-synth-${id}`}
        state={sphereState}
        color={SYNTHESIS_COLOR}
        size='sm'
        showMatrix={sphereState !== 'idle'}
        solidBg
        bgOpacity={0.7}
        particleCount={40}
      />
      <span className='font-serif text-[10px] text-foreground text-center leading-tight max-w-[200px] truncate'>
        {label}
      </span>
      <Handle type='source' position={Position.Right} className='!size-2.5 !bg-primary !border-primary' />
    </div>
  )
}
