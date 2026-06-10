'use client'

import { Card, CardContent } from '@atta/ui/components'
import { Heading } from '@atta/ui/shared'
import type { Flow, FlowAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'
import Link from 'next/link'
import { getDisplayAgentNames, getFlowAgentCount, getFlowShapeLabel } from '@/lib/flow-helpers'

interface DisplayAgent {
  name: string
  role: AgentRole | undefined
  model: string | undefined
}

function getDisplayAgents(flow: Flow): DisplayAgent[] {
  const agentMap = new Map<string, FlowAgent>(flow.agents.map((a) => [a.name, a]))
  const lookup = (name: string): DisplayAgent => {
    const a = agentMap.get(name)
    return { name, role: a?.role as AgentRole | undefined, model: a?.model }
  }
  return getDisplayAgentNames(flow).map(lookup)
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

export function TeamCard({ spec }: { spec: Flow }) {
  const agents = getDisplayAgents(spec)
  const count = getFlowAgentCount(spec)
  const shapeLabel = getFlowShapeLabel(spec)
  const defaultModel = spec.defaults.model

  const sphereProps = { specId: spec.id, defaultModel }

  let spheres: React.ReactNode

  if (agents.length <= 2) {
    spheres = (
      <div className='flex justify-around items-center py-4'>
        {agents.map((a) => (
          <Sphere key={a.name} agent={a} size='xl' {...sphereProps} />
        ))}
      </div>
    )
  } else if (agents.length === 3) {
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
