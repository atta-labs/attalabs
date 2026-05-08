'use client'

import { Card, CardContent } from '@atta/ui'
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

type SphereSize = 'sm' | 'md' | 'lg' | 'xl'

function Sphere({
  agent,
  size,
  specId,
  defaultModel
}: {
  agent: DisplayAgent
  size: SphereSize
  specId: string
  defaultModel: string
}) {
  return (
    <VadaAgent
      id={`card-${specId}-${agent.name}`}
      name={agent.name}
      role={agent.role}
      model={agent.role ? undefined : (agent.model ?? defaultModel)}
      state='speaking'
      size={size}
      visible
      label={agent.role ? undefined : 'REVIEWER'}
    />
  )
}

export function TeamCard({ spec }: { spec: DeliberationSpec }) {
  const agents = getDisplayAgents(spec)
  const count = getAgentCount(spec)
  const shapeLabel = getShapeLabel(spec)
  const defaultModel = spec.defaults.model

  const sphereProps = { specId: spec.id, defaultModel }

  let spheres: React.ReactNode

  if (agents.length <= 2) {
    // 2 agents: large, fills the row
    spheres = (
      <div className='flex justify-around items-center py-4'>
        {agents.map((a) => (
          <Sphere key={a.name} agent={a} size='xl' {...sphereProps} />
        ))}
      </div>
    )
  } else if (agents.length === 3) {
    // 3 agents: downward triangle — 3-col × 2-row grid
    // row 1 col 1, row 1 col 3, row 2 col 2
    const [a0, a1, a2] = [agents.at(0), agents.at(1), agents.at(2)]
    spheres = (
      <div className='grid grid-cols-3 grid-rows-2 gap-4 py-2'>
        <div className='col-start-1 row-start-1 flex justify-center items-center'>
          {a0 && <Sphere agent={a0} size='md' {...sphereProps} />}
        </div>
        <div className='col-start-3 row-start-1 flex justify-center items-center'>
          {a1 && <Sphere agent={a1} size='md' {...sphereProps} />}
        </div>
        <div className='col-start-2 row-start-2 flex justify-center items-center'>
          {a2 && <Sphere agent={a2} size='md' {...sphereProps} />}
        </div>
      </div>
    )
  } else if (agents.length <= 4) {
    spheres = (
      <div className='grid grid-cols-2 gap-4 justify-items-center py-2'>
        {agents.map((a) => (
          <Sphere key={a.name} agent={a} size='md' {...sphereProps} />
        ))}
      </div>
    )
  } else {
    spheres = (
      <div className='grid grid-cols-3 gap-3 justify-items-center py-2'>
        {agents.map((a) => (
          <Sphere key={a.name} agent={a} size='md' {...sphereProps} />
        ))}
      </div>
    )
  }

  return (
    <Card className='gap-4 py-0'>
      <CardContent className='flex flex-col gap-4 p-4'>
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

      <Link
        href={`/teams/${spec.id}`}
        className='inline-block font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors'
      >
        Learn more →
      </Link>

      {spheres}
      </CardContent>
    </Card>
  )
}
