'use client'

import type { Flow, FlowAgent } from '@atta/engine'
import { VadaAgent } from '@/components/agents/VadaAgent'
import type { AgentRole } from '@/components/agents/VadaAgent'
import { getDisplayAgentNames } from '@/lib/flow-helpers'

export function AgentTab({ spec }: { spec: Flow }) {
  const displayNames = new Set(getDisplayAgentNames(spec))
  const roundAgents = spec.agents.filter((a: FlowAgent) => displayNames.has(a.name))

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      {roundAgents.map((agent: FlowAgent) => (
        <div key={agent.name} className='flex flex-col gap-4 rounded-lg border border-border/40 bg-card p-6'>
          <VadaAgent
            id={`agent-tab-${spec.id}-${agent.name}`}
            name={agent.name}
            role={agent.role as AgentRole | undefined}
            model={undefined}
            state='speaking'
            size='md'
            visible
          />
          <p className='text-sm leading-relaxed text-foreground/70'>{agent.description}</p>
        </div>
      ))}
    </div>
  )
}
