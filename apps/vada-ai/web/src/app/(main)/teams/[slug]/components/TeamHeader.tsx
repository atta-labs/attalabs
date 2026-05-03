import { Heading } from '@atta/ui/shared'
import type { DeliberationSpec } from '@atta/engine'

function getShapeLabel(spec: DeliberationSpec): string {
  if (spec.flow?.rounds) {
    const { count, agents } = spec.flow.rounds
    return `${count} rounds · ${agents.length} agents per round`
  }
  if (spec.reviewers) {
    const hasSynth = spec.flow?.synthesis != null
    return hasSynth ? 'parallel reviewers + synthesis' : 'parallel reviewers'
  }
  return 'single agent'
}

function getAgentCount(spec: DeliberationSpec): number {
  if (spec.flow?.rounds) return spec.flow.rounds.agents.length
  if (spec.reviewers) {
    const hasSynth = spec.flow?.synthesis != null
    return spec.reviewers.length + (hasSynth ? 1 : 0)
  }
  return 1
}

export function TeamHeader({ spec }: { spec: DeliberationSpec }) {
  const shapeLabel = getShapeLabel(spec)
  const agentCount = getAgentCount(spec)

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
