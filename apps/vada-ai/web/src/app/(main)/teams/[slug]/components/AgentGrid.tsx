'use client'

import type { DeliberationSpec, SpecAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'

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

function getGridClass(count: number): string {
  if (count <= 3) return 'flex flex-wrap justify-center gap-8'
  if (count <= 4) return 'grid grid-cols-4 gap-6 justify-items-center'
  return 'grid grid-cols-3 gap-6 justify-items-center sm:grid-cols-6'
}

export function AgentGrid({ spec }: { spec: DeliberationSpec }) {
  const agents = getDisplayAgents(spec)
  const defaultModel = spec.defaults.model

  return (
    <div className={getGridClass(agents.length)}>
      {agents.map((agent) => (
        <div key={agent.name} className='flex flex-col items-center gap-2'>
          <VadaAgent
            id={`detail-${spec.id}-${agent.name}`}
            name={agent.name}
            role={agent.role}
            model={agent.model ?? defaultModel}
            state='speaking'
            size='lg'
            visible
            label={agent.role ? undefined : 'REVIEWER'}
          />
        </div>
      ))}
    </div>
  )
}
