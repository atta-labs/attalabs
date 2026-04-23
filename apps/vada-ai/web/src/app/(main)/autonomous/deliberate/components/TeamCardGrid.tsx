'use client'

import { VadaAgent as AIAgent, type AgentName } from '@vada/agents'
import { NextLink } from '@atta/ui/lib/next-link'
import { TeamCard } from '@atta/ui/shared'
import { ModelIcon } from '@atta/ui'
import { useCatalog } from '@atta/models'
import { memo } from 'react'
import { PRESETS, type Preset, type PresetId } from '@/schemas'
import type { ModelSelection } from './GlobalModelSelector'

type FaceSize = 'sm' | 'md' | 'lg' | 'xl'

const FACE_LAYOUT: Record<PresetId, { gridClass: string; size: FaceSize }> = {
  crucible: { gridClass: 'grid grid-cols-2 gap-4 justify-items-center py-2', size: 'md' },
  war_room: { gridClass: 'grid grid-cols-3 gap-3 justify-items-center py-2', size: 'md' },
  sparring: { gridClass: 'flex justify-center gap-8 py-2', size: 'xl' }
}

const SHORT_DESCRIPTIONS: Record<PresetId, string> = {
  crucible:
    "Vada's standard format. Four agents debate across three rounds and produce a validated conclusion audited by the Blind Critic.",
  war_room:
    "Adds a Researcher and an Operator to The Crucible's core four. The heavyweight configuration — evidence and feasibility both matter.",
  sparring:
    'A fast, two-agent exchange between Strategist and Critic. No synthesis — just raw friction. Three volleys, five max.'
}

const SCIENCE_URL = '/autonomous/science/architecture/agents'

interface TeamCardGridProps {
  selectedPreset: Preset
  onSelectPreset: (p: Preset) => void
  globalModel: ModelSelection | null
}

// Memoized: every keystroke in the question input re-renders the parent.
// Without memo, that cascade re-renders AIAgent spheres → visible flicker on
// matrix rain + particle positions. Default shallow equality is enough here
// because useDeliberateForm wraps handleStart in useCallback (stable ref)
// and PRESETS are module-level constants (stable refs).
export const TeamCardGrid = memo(function TeamCardGrid({
  selectedPreset,
  onSelectPreset,
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
      {PRESETS.map((preset) => {
        const isSelected = selectedPreset.id === preset.id
        const layout = FACE_LAYOUT[preset.id]
        return (
          <TeamCard
            key={preset.id}
            title={preset.name}
            titleAside={
              <span className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                {preset.agents.length} agents
              </span>
            }
            model={headerModel}
            description={
              <>
                {SHORT_DESCRIPTIONS[preset.id]}
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
                {preset.agents.map((agent) => (
                  <AIAgent
                    key={agent.role}
                    id={`teamcard-${preset.id}-${agent.role}`}
                    name={agent.name as AgentName}
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
            onSelect={() => onSelectPreset(preset)}
          />
        )
      })}
    </div>
  )
})
