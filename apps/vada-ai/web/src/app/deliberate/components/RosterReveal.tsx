'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown, Map as MapIcon, Settings, ShieldAlert, Scale, Zap } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger, Input } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { getStoredApiKey, storeApiKey } from '@/lib/model-keys'
import { MODEL_OPTIONS, type ModelSelection, type PerAgentModelMap } from './GlobalModelSelector'
import type { AgentConfig } from '@/schemas'
import type { Provider } from '@/lib/models'
import type { LucideIcon } from 'lucide-react'

interface AgentMeta {
  icon: LucideIcon
  description: string
}

const AGENT_META: Record<string, AgentMeta> = {
  strategist: { icon: MapIcon, description: 'Maps the landscape, governs trajectory' },
  critic: { icon: ShieldAlert, description: 'Detects fallacies, demands grounding' },
  devils_advocate: { icon: Zap, description: 'Prevents early consensus' },
  synthesizer: { icon: Scale, description: 'Reconciles contradictions into action' },
  researcher: { icon: BookOpen, description: 'Grounds claims in evidence' },
  operator: { icon: Settings, description: 'Drives execution clarity' }
}

interface RosterRevealProps {
  agents: AgentConfig[]
  perAgentMode: boolean
  perAgentValues: PerAgentModelMap
  onPerAgentChange: (role: string, v: ModelSelection) => void
}

export function RosterReveal({ agents, perAgentMode, perAgentValues, onPerAgentChange }: RosterRevealProps) {
  const [open, setOpen] = useState(true)

  const handleSelectChange = (role: string, providerValue: string) => {
    const opt = MODEL_OPTIONS.find((m) => m.provider === providerValue)
    if (!opt) return
    const apiKey = getStoredApiKey(opt.provider)
    onPerAgentChange(role, { provider: opt.provider, modelId: opt.modelId, apiKey })
  }

  const handleKeyChange = (role: string, provider: Provider, key: string) => {
    storeApiKey(provider, key)
    const current = perAgentValues[role]
    if (current) onPerAgentChange(role, { ...current, apiKey: key })
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className='rounded-lg border border-border/30 bg-card/40'>
      <CollapsibleTrigger className='flex w-full items-center justify-between px-4 py-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'>
        <span className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>Room Roster</span>
        <ChevronDown
          className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className='flex flex-col gap-1 px-3 pb-3'>
          {agents.map((agent) => {
            const meta = AGENT_META[agent.role]
            const Icon = meta?.icon
            const selection = perAgentValues[agent.role]
            const needsKey = perAgentMode && selection && !getStoredApiKey(selection.provider)

            return (
              <div key={agent.role} className='space-y-1.5'>
                <div className='flex items-center gap-3 rounded-md px-1 py-2'>
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/30 ring-1 ring-border/20'>
                    {Icon && <Icon className='h-3.5 w-3.5 text-muted-foreground' />}
                  </div>

                  <div className='min-w-0 flex-1'>
                    <Text as='p' className='font-serif text-sm font-medium leading-none text-foreground'>
                      {agent.name}
                    </Text>
                    {meta?.description && (
                      <Text as='p' size='xs' muted className='mt-1 leading-none'>
                        {meta.description}
                      </Text>
                    )}
                  </div>

                  {perAgentMode && (
                    <select
                      value={selection?.provider ?? ''}
                      onChange={(e) => handleSelectChange(agent.role, e.target.value)}
                      className='ml-auto rounded border border-border/50 bg-background px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-muted-foreground'
                    >
                      <option value='' disabled>
                        Model…
                      </option>
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m.provider} value={m.provider}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {needsKey && selection && (
                  <Input
                    type='password'
                    autoComplete='off'
                    placeholder={`API key for ${selection.provider}…`}
                    className='font-mono text-xs'
                    onChange={(e) => handleKeyChange(agent.role, selection.provider, e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
