'use client'

import type { DeliberationSpec, SpecAgent } from '@atta/engine'
import { VadaAgent as AIAgent, type AgentName } from '@/components/agents'
import type { AgentRole } from '@/components/agents/VadaAgent'
import { NextLink } from '@atta/ui/lib/next-link'
import { TeamCard } from '@atta/ui/shared'
import { ModelIcon } from '@atta/ui'
import { useCatalog } from '@atta/models'
import { memo } from 'react'
import type { ModelSelection } from './GlobalModelSelector'

type FaceSize = 'sm' | 'md' | 'lg' | 'xl'

interface DisplayAgent {
  name: string
  role: AgentRole | undefined
}

function getDisplayAgents(spec: DeliberationSpec): DisplayAgent[] {
  const agentMap = new Map<string, SpecAgent>(spec.agents.map((a) => [a.name, a]))

  const lookup = (name: string): DisplayAgent => {
    const a = agentMap.get(name)
    return { name, role: a?.role as AgentRole | undefined }
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

function getFaceLayout(agentCount: number): { gridClass: string; size: FaceSize } {
  if (agentCount <= 2) return { gridClass: 'flex justify-center gap-8 py-2', size: 'xl' }
  if (agentCount <= 4) return { gridClass: 'grid grid-cols-2 gap-4 justify-items-center py-2', size: 'md' }
  return { gridClass: 'grid grid-cols-3 gap-3 justify-items-center py-2', size: 'md' }
}

interface TeamCardGridProps {
  specs: DeliberationSpec[]
  selectedSpecId: string
  onSelectSpec: (id: string) => void
  globalModel: ModelSelection | null
}

// Memoized: every keystroke in the question input re-renders the parent.
// Without memo, that cascade re-renders AIAgent spheres → visible flicker on
// matrix rain + particle positions. Default shallow equality is enough here
// because useDeliberateForm wraps handleStart in useCallback (stable ref)
// and specs are passed from a server component (stable refs per navigation).
export const TeamCardGrid = memo(function TeamCardGrid({
  specs,
  selectedSpecId,
  onSelectSpec,
  globalModel
}: TeamCardGridProps) {
  const catalog = useCatalog()
  const modelEntry = globalModel
    ? (catalog.find((e) => e.route === globalModel.provider && e.modelId === globalModel.modelId) ?? null)
    : null
  const modelId = globalModel?.modelId
  const modelLabel = modelEntry?.label ?? modelId

  const headerModel = modelId ? (
    <span
      className='flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground'
      title={modelLabel}
    >
      <ModelIcon model={modelId} size={16} type='avatar' />
      <span className='truncate'>{modelLabel}</span>
    </span>
  ) : undefined

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
      {specs.map((spec) => {
        const isSelected = selectedSpecId === spec.id
        const displayAgents = getDisplayAgents(spec)
        const agentCount = getAgentCount(spec)
        const layout = getFaceLayout(agentCount)
        return (
          <TeamCard
            key={spec.id}
            title={spec.displayName}
            titleAside={
              <span className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                {agentCount} agents
              </span>
            }
            model={headerModel}
            description={
              <>
                <span className='line-clamp-3'>{spec.description}</span>
                <div className='mt-1'>
                  <NextLink
                    href={`/teams/${spec.id}`}
                    variant='prose'
                    className='text-xs'
                    onClick={(event) => event.stopPropagation()}
                  >
                    Learn more →
                  </NextLink>
                </div>
              </>
            }
            faces={
              <div className={layout.gridClass}>
                {displayAgents.map((agent) => (
                  <AIAgent
                    key={agent.name}
                    id={`teamcard-${spec.id}-${agent.name}`}
                    name={agent.name as AgentName}
                    role={agent.role}
                    state={isSelected ? 'speaking' : 'idle'}
                    size={layout.size}
                    visible
                    showMatrix={isSelected}
                    solidBg={isSelected}
                    model={modelId}
                    modelLabel={modelLabel}
                  />
                ))}
              </div>
            }
            selected={isSelected}
            onSelect={() => onSelectSpec(spec.id)}
          />
        )
      })}
    </div>
  )
})
