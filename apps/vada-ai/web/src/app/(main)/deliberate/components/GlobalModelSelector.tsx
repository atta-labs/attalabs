'use client'

import { probeProviderKey } from '@atta/identity'
import { useIdentity } from '@atta/identity/react'
import { type ModelConfig, type RouteProvider, useCatalog } from '@atta/models'
import { ModelPicker, useToastContext } from '@atta/ui'
import { useEffect } from 'react'

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
  const identity = useIdentity()
  const storedKeys = identity.state.keys
  const { successToast } = useToastContext()

  // Mount: seed from settings preset, else fall back to in-memory identity
  useEffect(() => {
    if (selectedPresetId && initialTeamModels.length > 0) {
      const entry = initialTeamModels.find((m) => m.teamId === selectedPresetId)
      if (entry) {
        const route = entry.provider as RouteProvider
        onChange({
          provider: route,
          modelId: entry.modelId,
          apiKey: storedKeys[route] ?? ''
        })
        return
      }
    }
    // Default selection: first catalog entry whose route has a stored key
    if (!value) {
      const first = catalog.find((e) => storedKeys[e.route])
      if (first) {
        onChange({ provider: first.route, modelId: first.modelId, apiKey: storedKeys[first.route] ?? '' })
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
      apiKey: storedKeys[route] ?? ''
    })
  }, [selectedPresetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const configuredRoutes = new Set<RouteProvider>([
    ...(settingsProviders as RouteProvider[]),
    ...(Object.keys(storedKeys) as RouteProvider[])
  ])

  // Last-4 of each configured key, shown next to the provider heading in
  // the picker. Never the full key — just enough for the user to cross-
  // reference with their provider dashboard.
  const routeHints: Partial<Record<RouteProvider, string>> = {}
  for (const [route, key] of Object.entries(storedKeys) as [RouteProvider, string | undefined][]) {
    if (key && key.length >= 4) routeHints[route] = key.slice(-4)
  }

  const pickerValue = value ? { route: value.provider, modelId: value.modelId } : null

  const handleChange = (next: { route: RouteProvider; modelId: string }) => {
    onChange({ provider: next.route, modelId: next.modelId, apiKey: storedKeys[next.route] ?? '' })
  }

  const handleProvideKey = async (route: RouteProvider, key: string) => {
    // Probe the key against the provider before persisting it. See /trust —
    // the probe is a browser → provider call with the user's own key; it
    // never touches the Vāda server.
    //
    // Throwing on failure keeps the ModelPicker's key-entry view open and
    // surfaces the error inline. The picker closes only on a resolved promise.
    const modelId = value?.provider === route ? value.modelId : undefined
    const probe = await probeProviderKey(route, key, modelId)
    if (!probe.ok) {
      throw new Error(probe.error ?? 'Could not verify key against provider.')
    }
    identity.setKey(route, key)
    if (value?.provider === route) onChange({ ...value, apiKey: key })
    successToast('Key verified', `${route} is ready to use.`)
  }

  return (
    <ModelPicker
      options={catalog}
      value={pickerValue}
      onChange={handleChange}
      configuredRoutes={configuredRoutes}
      routeHints={routeHints}
      onProvideKey={handleProvideKey}
      mode='modal'
      settingsHref='/settings'
      settingsLabel='Configure defaults →'
    />
  )
}

export type { ModelConfig }
