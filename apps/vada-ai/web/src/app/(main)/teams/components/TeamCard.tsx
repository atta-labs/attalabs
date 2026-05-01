'use client'

import { cn } from '@atta/ui/lib/utils'
import { Heading } from '@atta/ui/shared'
import type { DeliberationSpec, SpecAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'
import Link from 'next/link'

interface DisplayAgent {
  name: string
  role: AgentRole | undefined
  model: string | undefined
}

function getDisplayAgents(spec: DeliberationSpec): DisplayAgent[] {
  const agentMap = new Map<string, SpecAgent>(spec.agents.map((a) => [a.name, a]))

  const lookup = (name: string): DisplayAgent => {
    const a = agentMap.get(name)
    return { name, role: a?.role as AgentRole | undefined, model: a?.model }
  }

  if (spec.flow?.rounds) {
    return spec.flow.rounds.agents.map(lookup)
  }
  if (spec.reviewers && spec.reviewers.length > 0) {
    const reviewers = spec.reviewers.map((r) => lookup(r.agent))
    const synthName = spec.flow?.synthesis?.agent
    if (synthName) reviewers.push(lookup(synthName))
    return reviewers
  }
  return spec.agents.slice(0, 1).map((a) => lookup(a.name))
}

function getAgentCount(spec: DeliberationSpec): number {
  if (spec.flow?.rounds) return spec.flow.rounds.agents.length
  if (spec.reviewers) {
    const hasSynth = spec.flow?.synthesis != null
    return spec.reviewers.length + (hasSynth ? 1 : 0)
  }
  return 1
}

function getShapeLabel(spec: DeliberationSpec): string {
  if (spec.flow?.rounds) {
    const { count } = spec.flow.rounds
    return `${count} rounds`
  }
  if (spec.reviewers) {
    const hasSynth = spec.flow?.synthesis != null
    return hasSynth ? 'reviewers + synthesis' : 'parallel reviewers'
  }
  return 'single shot'
}

function getSphereLayout(count: number): string {
  if (count <= 2) return 'flex justify-center gap-8 py-2'
  if (count === 3) return 'flex justify-center gap-6 py-2'
  if (count <= 4) return 'grid grid-cols-2 gap-4 justify-items-center py-2'
  return 'grid grid-cols-3 gap-3 justify-items-center py-2'
}

export function TeamCard({ spec }: { spec: DeliberationSpec }) {
  const agents = getDisplayAgents(spec)
  const count = getAgentCount(spec)
  const shapeLabel = getShapeLabel(spec)
  const defaultModel = spec.defaults.model

  return (
    <div className={cn('flex flex-col gap-4 rounded-lg bg-card p-4', 'border border-border/40')}>
      <div className='flex flex-col gap-1'>
        <div className='flex items-baseline justify-between gap-3'>
          <Heading level={3} size='lg' className='font-serif text-foreground'>
            {spec.displayName}
          </Heading>
          <span className='shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
            {count} agents
          </span>
        </div>
        <span className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>{shapeLabel}</span>
      </div>

      <p className='line-clamp-3 text-sm text-muted-foreground leading-snug min-h-[3.75rem]'>{spec.description}</p>

      <div className={getSphereLayout(agents.length)}>
        {agents.map((agent) => (
          <VadaAgent
            key={agent.name}
            id={`card-${spec.id}-${agent.name}`}
            name={agent.name}
            role={agent.role}
            model={agent.model ?? defaultModel}
            state='speaking'
            size='md'
            visible
            label={agent.role ? undefined : 'REVIEWER'}
          />
        ))}
      </div>

      <Link
        href={`/teams/${spec.id}`}
        className='self-start font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors'
      >
        Learn more →
      </Link>
    </div>
  )
}
