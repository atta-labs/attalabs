'use client'

import { useCatalog, type RouteProvider } from '@atta/models'
import { ModelPicker } from '@atta/ui'
import { VadaAgent as AIAgent, type AgentName } from '@/components/agents'
import { Text } from '@atta/ui/shared'
import type { AgentDef } from '@vada/agents'

import type { TeamModelEntry } from '@/db/settings-queries'
import { useUserPreferences } from '@/lib/user-preferences-context'

interface AgentModelRowProps {
  agent: AgentDef
  teamId: string
  currentModel: { provider: string; modelId: string } | null
  configuredProviders: Set<string>
  onChanged: (entry: TeamModelEntry) => void
}

export function AgentModelRow({ agent, teamId, currentModel, configuredProviders, onChanged }: AgentModelRowProps) {
  const catalog = useCatalog()
  const { faceStyle } = useUserPreferences()

  const save = async (provider: string, modelId: string) => {
    onChanged({ teamId, agentRole: agent.role, provider, modelId })
    await fetch('/api/settings/team-models', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, agentRole: agent.role, provider, modelId })
    })
  }

  const pickerValue = currentModel
    ? { route: currentModel.provider as RouteProvider, modelId: currentModel.modelId }
    : null

  return (
    <div className='flex flex-col items-center gap-3 rounded-lg border border-border/10 p-4'>
      <AIAgent
        id={`settings-${teamId}-${agent.role}`}
        name={agent.name as AgentName}
        faceStyle={faceStyle}
        size='lg'
        state='idle'
        showMatrix
        solidBg
        noLabel
      />

      <Text as='p' className='font-serif text-sm text-foreground/80'>
        {agent.name}
      </Text>

      <ModelPicker
        options={catalog}
        value={pickerValue}
        onChange={({ route, modelId }) => save(route, modelId)}
        configuredRoutes={configuredProviders as Set<RouteProvider>}
        align='start'
        side='bottom'
      />
    </div>
  )
}
