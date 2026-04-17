'use client'

import { AIACanvas, AIAgent, type AgentName } from '@atta/ui/canvas'
import { NextLink } from '@atta/ui/lib/next-link'
import { TeamCard } from '@atta/ui/shared'
import { PRESETS, type Preset, type PresetId } from '@/schemas'

type FaceSize = 'sm' | 'md' | 'lg' | 'xl'

const FACE_LAYOUT: Record<PresetId, { gridClass: string; size: FaceSize }> = {
  crucible: { gridClass: 'grid grid-cols-2 gap-x-3 gap-y-5 justify-items-center py-2', size: 'md' },
  war_room: { gridClass: 'grid grid-cols-3 gap-x-2 gap-y-5 justify-items-center py-2', size: 'md' },
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

const SCIENCE_URL = '/science/architecture/agents'

interface TeamCardGridProps {
  selectedPreset: Preset
  onSelectPreset: (p: Preset) => void
  onStart: () => void
  canStart: boolean
  loading: boolean
}

export function TeamCardGrid({ selectedPreset, onSelectPreset, onStart, canStart, loading }: TeamCardGridProps) {
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
              <AIACanvas alwaysRenderSpheres>
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
                    />
                  ))}
                </div>
              </AIACanvas>
            }
            ctaLabel={loading && isSelected ? 'STARTING…' : 'DELIBERATE'}
            onCtaClick={onStart}
            ctaDisabled={!canStart}
            selected={isSelected}
            onSelect={() => onSelectPreset(preset)}
          />
        )
      })}
    </div>
  )
}
