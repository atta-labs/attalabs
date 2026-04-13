'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Map as MapIcon, Settings, ShieldAlert, Scale, Zap } from 'lucide-react'
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
  strategist: { icon: MapIcon, description: 'Builds the plan' },
  critic: { icon: ShieldAlert, description: 'Finds the flaws' },
  devils_advocate: { icon: Zap, description: 'Stress-tests assumptions' },
  synthesizer: { icon: Scale, description: 'Weighs and concludes' },
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
    <div className='rounded-lg border border-border bg-card/50'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        className='flex w-full items-center justify-between px-4 py-3 text-[10px] uppercase tracking-[0.3em] '
      >
        <span>Room Roster</span>
        {open ? <ChevronUp className='h-3 w-3' /> : <ChevronDown className='h-3 w-3' />}
      </button>

      {open && (
        <div className='flex flex-col gap-1 px-3 pb-3'>
          {agents.map((agent) => {
            const meta = AGENT_META[agent.role]
            const Icon = meta?.icon
            const selection = perAgentValues[agent.role]
            const needsKey = perAgentMode && selection && !getStoredApiKey(selection.provider)

            return (
              <div key={agent.role} className='space-y-1.5'>
                <div className='flex items-center gap-3 rounded-md px-1 py-2'>
                  {/* Icon */}
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40'>
                    {Icon && <Icon className='h-3.5 w-3.5 ' />}
                  </div>

                  {/* Name + description */}
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-medium leading-none text-foreground'>{agent.name}</p>
                    {meta?.description && <p className='mt-0.5 text-[11px] leading-none '>{meta.description}</p>}
                  </div>

                  {/* Per-agent model dropdown */}
                  {perAgentMode && (
                    <select
                      value={selection?.provider ?? ''}
                      onChange={(e) => handleSelectChange(agent.role, e.target.value)}
                      className='ml-auto rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none'
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

                {/* API key input */}
                {needsKey && selection && (
                  <input
                    type='password'
                    autoComplete='off'
                    placeholder={`API key for ${selection.provider}…`}
                    className='w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs text-foreground outline-none'
                    onChange={(e) => handleKeyChange(agent.role, selection.provider, e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
