'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Text } from '@atta/ui/shared'
import { AIACanvas } from '@atta/ui/canvas'
import { AGENTS } from '@atta/agents'
import type { TeamDef } from '@atta/agents'
import type { TeamModelEntry } from '@/db/settings-queries'
import { AgentModelRow } from './AgentModelRow'

interface TeamAccordionItemProps {
  team: TeamDef
  teamModels: TeamModelEntry[]
  configuredProviders: Set<string>
  onModelChanged: (entry: TeamModelEntry) => void
}

export function TeamAccordionItem({ team, teamModels, configuredProviders, onModelChanged }: TeamAccordionItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className='border-b border-border/10 last:border-0'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex w-full items-center gap-3 py-3 text-left hover:text-foreground transition-colors'
      >
        {open ? (
          <ChevronDown className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
        ) : (
          <ChevronRight className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
        )}
        <Text as='span' className='font-mono text-[11px] uppercase tracking-widest text-foreground/80'>
          {team.name}
        </Text>
        <Text as='span' className='font-mono text-[10px] text-muted-foreground/50'>
          {team.agents.length} agents
        </Text>
      </button>

      {open && (
        <AIACanvas alwaysRenderSpheres className='w-full'>
          <div className='grid grid-cols-2 gap-3 pb-4 pt-1'>
            {team.agents.map((agentName) => {
              const agent = AGENTS[agentName]
              const saved = teamModels.find((m) => m.teamId === team.id && m.agentRole === agent.role)
              return (
                <AgentModelRow
                  key={agent.role}
                  agent={agent}
                  teamId={team.id}
                  currentModel={saved ? { provider: saved.provider, modelId: saved.modelId } : null}
                  configuredProviders={configuredProviders}
                  onChanged={onModelChanged}
                />
              )
            })}
          </div>
        </AIACanvas>
      )}
    </div>
  )
}
