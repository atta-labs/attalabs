'use client'

// Presentational only. All state / effects / handlers live in
// useGlobalModelSelector. See that file for the Ollama fetch, catalog build,
// preset seeding, action-triggered passkey unlock, and key-probe flow.

import type { ModelConfig, RouteProvider } from '@atta/models'
import { ModelPicker } from '@atta/ui'
import { useGlobalModelSelector } from './useGlobalModelSelector'

export interface ModelSelection {
  provider: RouteProvider
  modelId: string
  apiKey: string
}

export type PerAgentModelMap = Record<string, ModelSelection>

interface GlobalModelSelectorProps {
  value: ModelSelection | null
  onChange: (v: ModelSelection | null) => void
  settingsProviders?: string[]
  initialTeamModels?: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
  selectedSpecId?: string
}

export function GlobalModelSelector({
  value,
  onChange,
  settingsProviders = [],
  initialTeamModels = [],
  selectedSpecId
}: GlobalModelSelectorProps) {
  const g = useGlobalModelSelector({ value, onChange, settingsProviders, initialTeamModels, selectedSpecId })
  return (
    <ModelPicker
      options={g.catalog}
      value={g.pickerValue}
      onChange={g.handleChange}
      configuredRoutes={g.configuredRoutes}
      routeHints={g.routeHints}
      onProvideKey={g.handleProvideKey}
      mode='modal'
      settingsHref='/settings'
      settingsLabel='Configure defaults →'
    />
  )
}

export type { ModelConfig }
