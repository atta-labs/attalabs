'use client'

// All state + effects + async handlers for GlobalModelSelector. The component
// is pure presentation that reads the returned object.

import { fetchInstalledOllamaModels, probeProviderKey } from '@atta/identity'
import { useIdentity } from '@atta/identity/react'
import { type ModelEntry, type RouteProvider, useCatalog } from '@atta/models'
import { useToastContext } from '@atta/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ModelSelection } from './GlobalModelSelector'

interface UseGlobalModelSelectorProps {
  value: ModelSelection | null
  onChange: (v: ModelSelection | null) => void
  settingsProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
  selectedPresetId: string | undefined
}

export function useGlobalModelSelector({
  value,
  onChange,
  settingsProviders,
  initialTeamModels,
  selectedPresetId
}: UseGlobalModelSelectorProps) {
  const baseCatalog = useCatalog()
  const identity = useIdentity()
  const storedKeys = identity.state.keys
  const { successToast, errorToast } = useToastContext()

  // ── Ollama live model fetch ────────────────────────────────────────────────
  // /api/tags on mount. null = not probed, empty = reachable but nothing
  // installed, non-empty = replace hardcoded defaults in the catalog.
  const [installedOllama, setInstalledOllama] = useState<ModelEntry[] | null>(null)
  const [ollamaReachable, setOllamaReachable] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchInstalledOllamaModels()
      .then((models) => {
        if (!cancelled) {
          setInstalledOllama(models)
          setOllamaReachable(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInstalledOllama([])
          setOllamaReachable(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ── Catalog build ─────────────────────────────────────────────────────────
  // Swap hardcoded Ollama defaults for the live /api/tags list when we have
  // one; otherwise keep defaults so users can discover what to pull.
  const catalog = useMemo(() => {
    if (!ollamaReachable || installedOllama === null || installedOllama.length === 0) return baseCatalog
    const nonOllama = baseCatalog.filter((e) => e.route !== 'ollama')
    return [...nonOllama, ...installedOllama]
  }, [baseCatalog, ollamaReachable, installedOllama])

  // ── Preset / default seeding on mount ──────────────────────────────────────
  useEffect(() => {
    if (selectedPresetId && initialTeamModels.length > 0) {
      const entry = initialTeamModels.find((m) => m.teamId === selectedPresetId)
      if (entry) {
        const route = entry.provider as RouteProvider
        onChange({ provider: route, modelId: entry.modelId, apiKey: storedKeys[route] ?? '' })
        return
      }
    }
    if (!value) {
      const first = baseCatalog.find((e) => storedKeys[e.route])
      if (first) {
        onChange({ provider: first.route, modelId: first.modelId, apiKey: storedKeys[first.route] ?? '' })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preset-switch reseed ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPresetId || initialTeamModels.length === 0) return
    const entry = initialTeamModels.find((m) => m.teamId === selectedPresetId)
    if (!entry) return
    const route = entry.provider as RouteProvider
    onChange({ provider: route, modelId: entry.modelId, apiKey: storedKeys[route] ?? '' })
  }, [selectedPresetId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived picker inputs ──────────────────────────────────────────────────
  const configuredRoutes = useMemo(() => {
    const set = new Set<RouteProvider>([
      ...(settingsProviders as RouteProvider[]),
      ...(Object.keys(storedKeys) as RouteProvider[]),
      ...(identity.state.providers as RouteProvider[])
    ])
    if (ollamaReachable) set.add('ollama')
    return set
  }, [settingsProviders, storedKeys, identity.state.providers, ollamaReachable])

  const routeHints = useMemo(() => {
    const hints: Partial<Record<RouteProvider, string>> = {}
    for (const [route, key] of Object.entries(storedKeys) as [RouteProvider, string | undefined][]) {
      if (key && key.length >= 4) hints[route] = key.slice(-4)
    }
    return hints
  }, [storedKeys])

  const pickerValue = useMemo(() => (value ? { route: value.provider, modelId: value.modelId } : null), [value])

  // ── Handlers ───────────────────────────────────────────────────────────────
  // Action-triggered unlock: picking a model whose provider has a saved-but-
  // locked key fires the biometric prompt right here. After unlock we probe
  // the key against the provider — stale or garbage keys (e.g. mock-mode
  // placeholders from earlier dev work) get dropped and the user is told to
  // re-enter. Keeps the stored credential honest: "saved" means "verified".
  const handleChange = useCallback(
    async (next: { route: RouteProvider; modelId: string }) => {
      const needsUnlock =
        identity.state.kind === 'locked' && identity.state.providers.includes(next.route) && !storedKeys[next.route]
      if (needsUnlock) {
        try {
          const freshKeys = await identity.unlockWithPasskey()
          const storedKey = freshKeys[next.route]
          // Ollama has no auth to probe — skip the verification step.
          if (next.route === 'ollama' || !storedKey) {
            successToast('Unlocked', `Your ${next.route} key is loaded for this session.`)
            onChange({ provider: next.route, modelId: next.modelId, apiKey: storedKey ?? '' })
            return
          }
          // Verify the stored key still works. If not, drop it and ask for a
          // new one — the picker's onProvideKey flow handles re-entry.
          const probe = await probeProviderKey(next.route, storedKey, next.modelId)
          if (!probe.ok) {
            identity.removeKey(next.route)
            errorToast(
              `Stored ${next.route} key didn't verify`,
              probe.error ?? 'It looks stale. Enter a fresh key for this provider.'
            )
            return
          }
          successToast('Unlocked', `Your ${next.route} key is loaded for this session.`)
          onChange({ provider: next.route, modelId: next.modelId, apiKey: storedKey })
        } catch (e) {
          errorToast('Could not unlock', e instanceof Error ? e.message : 'Try again or enter keys manually.')
        }
        return
      }
      onChange({ provider: next.route, modelId: next.modelId, apiKey: storedKeys[next.route] ?? '' })
    },
    [identity, storedKeys, onChange, successToast, errorToast]
  )

  // Probe the key against the provider before persisting. Throwing on failure
  // keeps the ModelPicker key-entry view open (it catches and shows inline).
  const handleProvideKey = useCallback(
    async (route: RouteProvider, key: string) => {
      const modelId = value?.provider === route ? value.modelId : undefined
      const probe = await probeProviderKey(route, key, modelId)
      if (!probe.ok) {
        throw new Error(probe.error ?? 'Could not verify key against provider.')
      }
      identity.setKey(route, key)
      if (value?.provider === route) onChange({ ...value, apiKey: key })
      successToast('Key verified', `${route} is ready to use.`)
    },
    [value, identity, onChange, successToast]
  )

  return {
    catalog,
    configuredRoutes,
    routeHints,
    pickerValue,
    handleChange,
    handleProvideKey
  }
}
