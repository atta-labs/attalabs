'use client'

import { BookOpen, Map as MapIcon, Settings, ShieldAlert, Scale, Zap } from 'lucide-react'
import { Text } from '@atta/ui/shared'

import type { AgentConfig } from '@/schemas'
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
}

export function RosterReveal({ agents }: RosterRevealProps) {
  return (
    <div className='w-full max-w-2xl'>
      {agents.map((agent, i) => {
        const meta = AGENT_META[agent.role]
        const Icon = meta?.icon
        const num = String(i + 1).padStart(2, '0')

        return (
          <div key={agent.role} className='flex items-start gap-4 border-b border-border/10 py-3 last:border-0'>
            <Text as='span' className='mt-0.5 w-5 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/30'>
              {num}
            </Text>
            <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/20'>
              {Icon && <Icon className='h-3 w-3 text-muted-foreground/50' />}
            </div>
            <div className='min-w-0 flex-1'>
              <Text as='p' className='font-serif text-sm font-medium leading-none text-foreground'>
                {agent.name}
              </Text>
              {meta?.description && (
                <Text as='p' size='xs' muted className='mt-1 leading-snug'>
                  {meta.description}
                </Text>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
