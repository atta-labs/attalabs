'use client'

import type { DeliberationSpec } from '@atta/engine'
import { VadaAgent as AIAgent, type AgentName } from '@/components/agents'
import { NextLink } from '@atta/ui/lib/next-link'
import { TeamCard } from '@atta/ui/shared'
import { ModelIcon } from '@atta/ui'
import { useCatalog } from '@atta/models'
import { memo } from 'react'
import type { ModelSelection } from './GlobalModelSelector'

type FaceSize = 'sm' | 'md' | 'lg' | 'xl'

function getFaceLayout(agentCount: number): { gridClass: string; size: FaceSize } {
  if (agentCount <= 2) return { gridClass: 'flex justify-center gap-8 py-2', size: 'xl' }
  if (agentCount <= 4) return { gridClass: 'grid grid-cols-2 gap-4 justify-items-center py-2', size: 'md' }
  return { gridClass: 'grid grid-cols-3 gap-3 justify-items-center py-2', size: 'md' }
}

const SCIENCE_URL = '/teams'

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
        const roundAgents = spec.flow?.rounds?.agents ?? []
        const layout = getFaceLayout(roundAgents.length)
        return (
          <TeamCard
            key={spec.id}
            title={spec.displayName}
            titleAside={
              <span className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                {roundAgents.length} agents
              </span>
            }
            model={headerModel}
            description={
              <>
                {spec.description}
                <div className='mt-1'>
                  <NextLink
                    href={SCIENCE_URL}
                    target='_blank'
                    rel='noopener noreferrer'
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
                {roundAgents.map((agentName) => (
                  <AIAgent
                    key={agentName}
                    id={`teamcard-${spec.id}-${agentName}`}
                    name={agentName as AgentName}
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
