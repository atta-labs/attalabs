'use client'

import type { DeliberationSpec, SpecAgent } from '@atta/engine'
import { VadaAgent, type AgentRole } from '@/components/agents/VadaAgent'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'

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
}

export function TeamSummary({ spec }: TeamSummaryProps) {
  const agents = getDisplayAgents(spec)
  const count = getAgentCount(spec)
  const shapeLabel = getShapeLabel(spec)
  const defaultModel = spec.defaults.model

  const spheres = (
    <div className='flex gap-6 overflow-x-auto pb-2'>
      {agents.map((a) => (
        <VadaAgent
          key={a.name}
          id={`summary-${spec.id}-${a.name}`}
          name={a.name}
          role={a.role}
          model={a.role ? undefined : (a.model ?? defaultModel)}
          state='speaking'
          size='md'
          visible
          label={a.role ? undefined : 'REVIEWER'}
          className='shrink-0'
        />
      ))}
    </div>
  )

  return (
    <div className='rounded-lg border border-border/40 bg-card p-6 space-y-4'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h2 className='font-serif text-xl text-foreground leading-tight'>{spec.displayName}</h2>
          <p className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
            {count} agents · {shapeLabel}
          </p>
        </div>
        <NextLink
          href={`/teams/${spec.id}`}
          variant='prose'
          className='flex items-center gap-1 text-xs shrink-0 mt-0.5'
        >
          Learn more
          <ArrowRight className='size-3' />
        </NextLink>
      </div>

      <p className='text-sm text-foreground leading-relaxed'>{spec.description}</p>

      {spheres}
    </div>
  )
}
