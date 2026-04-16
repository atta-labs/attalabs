'use client'

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@atta/ui'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@atta/ui/components/tooltip'
import { Text } from '@atta/ui/shared'
import { AIAgent, type AgentName } from '@atta/ui/canvas'
import { ChevronDown } from 'lucide-react'
import type { AgentDef } from '@atta/agents'
import type { TeamModelEntry } from '@/db/settings-queries'
import { PROVIDERS } from '@/lib/provider-models'
import { useUserPreferences } from '@/lib/user-preferences-context'

interface AgentModelRowProps {
  agent: AgentDef
  teamId: string
  currentModel: { provider: string; modelId: string } | null
  configuredProviders: Set<string>
  onChanged: (entry: TeamModelEntry) => void
}

export function AgentModelRow({ agent, teamId, currentModel, configuredProviders, onChanged }: AgentModelRowProps) {
  const { faceStyle } = useUserPreferences()

  const save = async (provider: string, modelId: string) => {
    onChanged({ teamId, agentRole: agent.role, provider, modelId })
    await fetch('/api/settings/team-models', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, agentRole: agent.role, provider, modelId })
    })
  }

  return (
    <div className='flex flex-col items-center gap-3 rounded-lg border border-border/10 p-4'>
      {/* Agent sphere — canvas provided by parent grid wrapper */}
      <AIAgent
        id={`settings-${teamId}-${agent.role}`}
        name={agent.name as AgentName}
        faceStyle={faceStyle}
        size='lg'
        state='idle'
        showMatrix
        solidBg
        noLabel
      />

      {/* Agent name */}
      <Text as='p' className='font-serif text-sm text-foreground/80'>
        {agent.name}
      </Text>

      {/* Model dropdown */}
      <TooltipProvider>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              className='h-auto gap-1.5 p-0 font-mono text-[10px] uppercase tracking-widest text-foreground/60 hover:text-foreground'
            >
              {currentModel ? `${currentModel.modelId}` : 'Select model'}
              <ChevronDown className='h-3 w-3' />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align='start' className='w-64 border-border/40 bg-card/95 backdrop-blur-md'>
            {PROVIDERS.map((providerDef, i) => (
              <div key={providerDef.id}>
                {i > 0 && <DropdownMenuSeparator />}
                <Text
                  as='p'
                  className='px-2 pt-2 pb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/50'
                >
                  {providerDef.label}
                </Text>
                {providerDef.models.map((model) => {
                  const locked = !configuredProviders.has(providerDef.id)
                  return locked ? (
                    <Tooltip key={model.modelId}>
                      <TooltipTrigger>
                        {/* div wrapper receives pointer events even though inner item is disabled */}
                        <div className='opacity-30 cursor-not-allowed'>
                          <DropdownMenuItem disabled>
                            <Text as='span' className='font-mono text-[10px]'>
                              {model.label}
                            </Text>
                          </DropdownMenuItem>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side='right'>
                        <p className='text-xs'>Add your API key to use this model</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <DropdownMenuItem
                      key={model.modelId}
                      onClick={() => save(providerDef.id, model.modelId)}
                      className={
                        currentModel?.provider === providerDef.id && currentModel?.modelId === model.modelId
                          ? 'bg-muted/30'
                          : ''
                      }
                    >
                      <Text as='span' className='font-mono text-[10px]'>
                        {model.label}
                      </Text>
                    </DropdownMenuItem>
                  )
                })}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>
    </div>
  )
}
