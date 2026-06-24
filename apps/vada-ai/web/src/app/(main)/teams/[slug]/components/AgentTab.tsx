'use client'

import type { Flow, FlowAgent } from '@atta/engine'
import { VadaAgent } from '@/components/agents/VadaAgent'
import type { AgentRole } from '@/components/agents/VadaAgent'
import { AgentToolIndicator } from '@/components/AgentToolIndicator'
import { getDisplayAgentNames } from '@/lib/flow-helpers'

export function AgentTab({ spec, searchAvailable }: { spec: Flow; searchAvailable: boolean }) {
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
            // For roled agents the role drives face/color; model shows as badge.
            // For reviewer slots (no role), model drives the vendor sphere identity.
            model={agent.model}
            state='speaking'
            size='md'
            visible
            toolBadge={
              searchAvailable && agent.tools?.includes('web_search') ? (
                <AgentToolIndicator tool='web_search' />
              ) : undefined
            }
          />
          <p className='text-sm leading-relaxed text-foreground/70'>{agent.description}</p>
        </div>
      ))}
    </div>
  )
}
