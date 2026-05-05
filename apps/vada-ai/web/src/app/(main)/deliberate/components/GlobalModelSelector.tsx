'use client'

// Presentational only. All state / effects / handlers live in
// useGlobalModelSelector. See that file for the Ollama fetch, catalog build,
// preset seeding, action-triggered passkey unlock, and key-probe flow.

import type { ModelConfig, RouteProvider } from '@atta/models'
import { ModelPicker } from '@atta/ui'
import type { ReactNode } from 'react'
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
  selectedSpecId?: string
  specAgentNames?: string[]
  trigger?: ReactNode
}

export function GlobalModelSelector({
  value,
  onChange,
  settingsProviders = [],
  selectedSpecId,
  specAgentNames = [],
  trigger
}: GlobalModelSelectorProps) {
  const g = useGlobalModelSelector({ value, onChange, settingsProviders, selectedSpecId, specAgentNames })
  return (
    <ModelPicker
      options={g.catalog}
      value={g.pickerValue}
      onChange={g.handleChange}
      configuredRoutes={g.configuredRoutes}
      onProvideKey={g.handleProvideKey}
      mode='modal'
      trigger={trigger}
      settingsHref='/settings'
      settingsLabel='Configure defaults →'
    />
  )
}

export type { ModelConfig }
