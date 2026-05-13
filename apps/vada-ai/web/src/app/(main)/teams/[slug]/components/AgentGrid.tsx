'use client'

import type { Flow, FlowAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'
import { getDisplayAgentNames } from '@/lib/flow-helpers'

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

function getGridClass(count: number): string {
  if (count <= 3) return 'flex flex-wrap justify-center gap-8'
  if (count <= 4) return 'grid grid-cols-4 gap-6 justify-items-center'
  return 'grid grid-cols-3 gap-6 justify-items-center sm:grid-cols-6'
}

export function AgentGrid({ spec }: { spec: Flow }) {
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
