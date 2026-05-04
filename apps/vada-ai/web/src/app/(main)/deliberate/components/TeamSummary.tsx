'use client'

import type { ReactNode } from 'react'
import type { DeliberationSpec, SpecAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'
import { getReviewerConfig } from '@/lib/reviewer-models'
import { NextLink } from '@atta/ui/lib/next-link'
import { Button } from '@atta/ui'
import { ArrowRight, Settings2 } from 'lucide-react'
import { useState } from 'react'

interface DisplayAgent {
  name: string
  role: AgentRole | undefined
  model: string | undefined
}

function getDisplayAgents(spec: DeliberationSpec): DisplayAgent[] {
  const agentMap = new Map<string, SpecAgent>(spec.agents.map((a) => [a.name, a]))

  const lookup = (name: string): DisplayAgent => {
    const a = agentMap.get(name)
    return { name, role: a?.role as AgentRole | undefined, model: a?.model }
  }

  if (spec.flow?.rounds) {
    return spec.flow.rounds.agents.map(lookup)
  }
  if (spec.reviewers && spec.reviewers.length > 0) {
    const reviewers = spec.reviewers.map((r) => lookup(r.agent))
    const synthName = spec.flow?.synthesis?.agent
    if (synthName) reviewers.push(lookup(synthName))
    return reviewers
  }
  return spec.agents.slice(0, 1).map((a) => lookup(a.name))
}

function getAgentCount(spec: DeliberationSpec): number {
  if (spec.flow?.rounds) return spec.flow.rounds.agents.length
  if (spec.reviewers) {
    const hasSynth = spec.flow?.synthesis != null
    return spec.reviewers.length + (hasSynth ? 1 : 0)
  }
  return 1
}

function getShapeLabel(spec: DeliberationSpec): string {
  if (spec.flow?.rounds) {
    const { count } = spec.flow.rounds
    return `${count} rounds`
  }
  if (spec.reviewers) {
    const hasSynth = spec.flow?.synthesis != null
    return hasSynth ? 'reviewers + synthesis' : 'parallel reviewers'
  }
  return 'single shot'
}

interface TeamSummaryProps {
  spec: DeliberationSpec
  pickers?: ReactNode
  actions?: ReactNode
  onConfigure?: () => void
}

export function TeamSummary({ spec, pickers, actions, onConfigure }: TeamSummaryProps) {
  const agents = getDisplayAgents(spec)
  const count = getAgentCount(spec)
  const shapeLabel = getShapeLabel(spec)
  const defaultModel = spec.defaults.model
  const [userConfig] = useState(() => getReviewerConfig(spec.id))

  const hasEditable = spec.agents.some((a) => a.editable)

  return (
    <div className='rounded-lg border border-border/40 bg-card overflow-hidden'>
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
    </div>
  )
}
