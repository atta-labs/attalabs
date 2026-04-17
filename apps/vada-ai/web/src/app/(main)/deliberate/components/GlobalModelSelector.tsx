'use client'

import { useEffect, useState } from 'react'
import {
  useCatalog,
  getStoredApiKey,
  storeApiKey,
  ROUTE_PROVIDER_ORDER,
  type ModelConfig,
  type RouteProvider
} from '@atta/models'
import { ModelPicker } from '@atta/ui'

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
  selectedPresetId?: string
}

export function GlobalModelSelector({
  value,
  onChange,
  settingsProviders = [],
  initialTeamModels = [],
  selectedPresetId
}: GlobalModelSelectorProps) {
  const catalog = useCatalog()
  const [storedKeys, setStoredKeys] = useState<Partial<Record<RouteProvider, string>>>({})

  // Mount: seed from settings preset, else fall back to localStorage
  useEffect(() => {
    if (selectedPresetId && initialTeamModels.length > 0) {
      const entry = initialTeamModels.find((m) => m.teamId === selectedPresetId)
      if (entry) {
        const route = entry.provider as RouteProvider
        onChange({
          provider: route,
          modelId: entry.modelId,
          apiKey: getStoredApiKey(route) ?? ''
        })
        return
      }
    }
    // Load all stored keys for configured-routes derivation
    const loaded: Partial<Record<RouteProvider, string>> = {}
    for (const r of ROUTE_PROVIDER_ORDER) {
      const k = getStoredApiKey(r)
      if (k) loaded[r] = k
    }
    setStoredKeys(loaded)
    // Default selection: first catalog entry whose route has a stored key
    if (!value) {
      const first = catalog.find((e) => loaded[e.route])
      if (first) {
        onChange({ provider: first.route, modelId: first.modelId, apiKey: loaded[first.route] ?? '' })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Preset changed → reseed from settings
  useEffect(() => {
    if (!selectedPresetId || initialTeamModels.length === 0) return
    const entry = initialTeamModels.find((m) => m.teamId === selectedPresetId)
    if (!entry) return
    const route = entry.provider as RouteProvider
    onChange({
      provider: route,
      modelId: entry.modelId,
      apiKey: getStoredApiKey(route) ?? ''
    })
  }, [selectedPresetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const configuredRoutes = new Set<RouteProvider>([
    ...(settingsProviders as RouteProvider[]),
    ...(Object.keys(storedKeys) as RouteProvider[])
  ])

  const pickerValue = value ? { route: value.provider, modelId: value.modelId } : null

  const handleChange = (next: { route: RouteProvider; modelId: string }) => {
    const apiKey = getStoredApiKey(next.route) ?? ''
    onChange({ provider: next.route, modelId: next.modelId, apiKey })
  }

  const handleProvideKey = (route: RouteProvider, key: string) => {
    storeApiKey(route, key)
    setStoredKeys((prev) => ({ ...prev, [route]: key }))
    if (value?.provider === route) onChange({ ...value, apiKey: key })
  }

  return (
    <ModelPicker
      options={catalog}
      value={pickerValue}
      onChange={handleChange}
      configuredRoutes={configuredRoutes}
      onProvideKey={handleProvideKey}
      mode='modal'
      settingsHref='/settings'
      settingsLabel='Configure defaults →'
    />
  )
}

export type { ModelConfig }
