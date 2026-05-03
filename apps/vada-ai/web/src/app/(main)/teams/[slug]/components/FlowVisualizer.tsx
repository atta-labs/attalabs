'use client'

import { FlowGraph } from '@atta/ui/engine-flow'
import type { Plan } from '@atta/engine'

export function FlowVisualizer({ plan }: { plan: Plan }) {
  return (
    <div className='w-full overflow-x-auto'>
      <FlowGraph plan={plan} autoHeight />
    </div>
  )
}
