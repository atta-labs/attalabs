'use client'

import type { DeliberationSpec, SpecAgent } from '@atta/engine'
import { VadaAgent } from '@/components/agents/VadaAgent'
import type { AgentRole } from '@/components/agents/VadaAgent'

function getRoundAgentNames(spec: DeliberationSpec): Set<string> {
  if (spec.flow?.rounds?.agents) return new Set(spec.flow.rounds.agents)
  if (spec.reviewers) return new Set(spec.reviewers.map((r) => r.agent))
  return new Set(spec.agents.map((a) => a.name))
}

export function AgentTab({ spec }: { spec: DeliberationSpec }) {
  const roundAgentNames = getRoundAgentNames(spec)
  const roundAgents = spec.agents.filter((a: SpecAgent) => roundAgentNames.has(a.name))

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      {roundAgents.map((agent: SpecAgent) => (
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
