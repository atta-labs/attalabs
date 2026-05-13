import { Heading } from '@atta/ui/shared'
import type { Flow } from '@atta/engine'
import { getFlowAgentCount, detectShape } from '@/lib/flow-helpers'

function getDetailShapeLabel(flow: Flow): string {
  const shape = detectShape(flow)
  if (shape === 'rounds-audit') {
    const roundCount = flow.rounds[0]!.repeats ?? 1
    const agentCount = flow.rounds[0]!.agents.length
    return `${roundCount} rounds · ${agentCount} agents per round`
  }
  if (shape === 'brokered-synth') return 'parallel reviewers + synthesis'
  if (shape === 'brokered-no-synth') return 'parallel reviewers'
  return 'single agent'
}

export function TeamHeader({ spec }: { spec: Flow }) {
  const shapeLabel = getDetailShapeLabel(spec)
  const agentCount = getFlowAgentCount(spec)

  return (
    <div className='space-y-2'>
      <Heading level={1} size='xl' className='font-serif text-foreground'>
        {spec.displayName}
      </Heading>
      <div className='flex items-center gap-4'>
        <span className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>{shapeLabel}</span>
        <span className='font-mono text-xs text-muted-foreground'>·</span>
        <span className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>{agentCount} agents</span>
      </div>
    </div>
  )
}
