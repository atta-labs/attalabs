'use client'

import { useMemo } from 'react'
import { FlowGraph } from '@atta/ui/engine-flow'
import type { DeliberationSpec } from '@atta/engine'
import { compileSpec } from '@atta/engine'

const PLACEHOLDER_QUESTION = 'What is the best approach for this challenge?'

export function FlowVisualizer({ spec }: { spec: DeliberationSpec }) {
  const plan = useMemo(
    () => compileSpec(spec, PLACEHOLDER_QUESTION),
    // spec.id is stable per render — spec object comes from server component
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.id]
  )

  return (
    <div className='h-[420px] w-full rounded-lg border border-border/40 overflow-hidden'>
      <FlowGraph plan={plan} className='h-full w-full' />
    </div>
  )
}
