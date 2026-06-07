'use client'

import type { ReactNode } from 'react'
import type { Flow, FlowAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'
import { getReviewerConfig } from '@/lib/reviewer-models'
import { NextLink } from '@atta/ui/lib/next-link'
import { Button, Card, CardContent } from '@atta/ui/components'
import { ArrowRight, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { getDisplayAgentNames, getFlowAgentCount, getFlowShapeLabel } from '@/lib/flow-helpers'

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

interface TeamSummaryProps {
  spec: Flow
  pickers?: ReactNode
  actions?: ReactNode
  onConfigure?: () => void
}

export function TeamSummary({ spec, pickers, actions, onConfigure }: TeamSummaryProps) {
  const agents = getDisplayAgents(spec)
  const count = getFlowAgentCount(spec)
  const shapeLabel = getFlowShapeLabel(spec)
  const defaultModel = spec.defaults.model
  const [userConfig] = useState(() => getReviewerConfig(spec.id))

  const hasEditable = spec.agents.some((a) => a.editable)

  return (
    <Card className='overflow-hidden py-0'>
      <CardContent className='p-0'>
        <div className='grid grid-cols-2'>
          {/* Left: title + pickers + spheres + configure button */}
          <div className='p-6 border-r border-border/40 flex flex-col gap-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='space-y-0.5'>
                <h2 className='font-serif text-xl text-foreground leading-tight'>{spec.displayName}</h2>
                <p className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                  {count} agents · {shapeLabel}
                </p>
              </div>
              {pickers && <div className='flex items-center gap-2 shrink-0'>{pickers}</div>}
            </div>

            <div className='flex flex-row gap-4 overflow-x-auto pb-1'>
              {agents.map((a) => (
                <VadaAgent
                  key={a.name}
                  id={`summary-${spec.id}-${a.name}`}
                  name={a.name}
                  role={a.role}
                  model={a.role ? undefined : (userConfig?.[a.name] ?? a.model ?? defaultModel)}
                  state='speaking'
                  size='md'
                  visible
                  label={a.role ? undefined : 'REVIEWER'}
                  className='shrink-0'
                />
              ))}
            </div>

            {hasEditable && onConfigure && (
              <Button
                variant='outline'
                size='sm'
                onClick={onConfigure}
                className='w-fit flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest'
              >
                <Settings2 className='size-3' />
                Configure models
              </Button>
            )}
          </div>

          {/* Right: description + learn more + actions */}
          <div className='p-6 flex flex-col gap-3'>
            <p className='text-sm text-foreground leading-relaxed'>{spec.description}</p>

            <NextLink href={`/teams/${spec.id}`} variant='prose' className='flex items-center gap-1 text-xs w-fit'>
              Learn more
              <ArrowRight className='size-3' />
            </NextLink>

            {actions && <div className='mt-auto pt-2'>{actions}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
