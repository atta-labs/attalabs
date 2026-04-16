'use client'

import { memo } from 'react'
import { AIACanvas, AIAgent, type AgentName, type FaceStyle } from '@atta/ui/canvas'
import { Text } from '@atta/ui/shared'
import { AGENTS } from '@atta/agents'
import { PRESETS } from '@/schemas'
import type { AgentConfig } from '@/schemas'
import { cn } from '@atta/ui/lib/utils'

// All unique agents across every preset — computed once at module level.
// These nodes are always mounted; canvas never remounts, no redistribution.
const ALL_ROSTER_AGENTS: AgentConfig[] = Array.from(
  new Map(PRESETS.flatMap((p) => p.agents).map((a) => [a.role, a])).values()
)

function AgentCard({ agent, active, faceStyle }: { agent: AgentConfig; active: boolean; faceStyle: FaceStyle }) {
  const agentName = agent.name as AgentName
  return (
    // opacity-0 keeps real layout position so getBoundingClientRect() stays accurate.
    // Canvas rendering is stopped via state/showMatrix/solidBg/visible on AIAgent.
    <div className={cn('flex flex-col items-center gap-2 py-2', !active && 'pointer-events-none opacity-0')}>
      <AIAgent
        id={`roster-${agent.role}`}
        name={agentName}
        faceStyle={faceStyle}
        state={active ? 'speaking' : 'idle'}
        size='md'
        showMatrix={active}
        solidBg={active}
        noLabel
        visible={active}
      />
      <div className='flex flex-col items-center gap-0.5 text-center'>
        <Text as='p' className='font-serif text-sm font-medium text-foreground'>
          {agent.name}
        </Text>
        <Text as='p' size='xs' className='text-[11px] leading-snug text-foreground/60'>
          {AGENTS[agentName]?.tagline}
        </Text>
      </div>
    </div>
  )
}

interface RoomRosterProps {
  selectedPresetId: string
  faceStyle: FaceStyle
}

export const RoomRoster = memo(function RoomRoster({ selectedPresetId, faceStyle }: RoomRosterProps) {
  const selectedPreset = PRESETS.find((p) => p.id === selectedPresetId) ?? PRESETS[0]!
  const activeRoles = new Set(selectedPreset.agents.map((a) => a.role))

  return (
    <div className='flex flex-col gap-3'>
      <Text as='p' className='font-mono text-[9px] uppercase tracking-widest text-foreground/50'>
        Room Roster: {selectedPreset.name}
      </Text>
      <AIACanvas alwaysRenderSpheres>
        <div className='grid grid-cols-3 gap-3'>
          {ALL_ROSTER_AGENTS.map((agent) => (
            <AgentCard key={agent.role} agent={agent} active={activeRoles.has(agent.role)} faceStyle={faceStyle} />
          ))}
        </div>
      </AIACanvas>
    </div>
  )
})
