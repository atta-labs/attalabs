'use client'

import { useState, useCallback, type ComponentType } from 'react'
import type { Plan } from '@atta/engine'
import { FlowGraph, mockEventDriver } from '@atta/ui/engine-flow'
import type { FlowEventSource, FlowRendererSet } from '@atta/ui/engine-flow'
import { Button } from '@atta/ui/components'
import { Play, RotateCcw } from 'lucide-react'
import type { NodeProps } from '@xyflow/react'
import { AgentFlowNode } from './AgentFlowNode'

const SPHERE_RENDERER_SET: FlowRendererSet = {
  agent: {
    component: AgentFlowNode as ComponentType<NodeProps>,
    bounds: { width: 220, height: 88 }
  }
}

export function FlowTab({ plan }: { plan: Plan }) {
  const [simKey, setSimKey] = useState(0)
  const [events, setEvents] = useState<FlowEventSource | undefined>(undefined)
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    setEvents(mockEventDriver(plan, { speed: 1 }))
  }, [plan])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setEvents(undefined)
    setSimKey((k) => k + 1)
  }, [])

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' onClick={handlePlay} disabled={isPlaying}>
          <Play className='size-3.5 mr-1.5' />
          {isPlaying ? 'Simulating…' : 'Simulate'}
        </Button>
        <Button variant='ghost' size='sm' onClick={handleReset}>
          <RotateCcw className='size-3.5 mr-1.5' />
          Reset
        </Button>
      </div>
      <div className='w-full overflow-x-auto'>
        <FlowGraph key={simKey} plan={plan} events={events} autoHeight rendererSet={SPHERE_RENDERER_SET} />
      </div>
    </div>
  )
}
