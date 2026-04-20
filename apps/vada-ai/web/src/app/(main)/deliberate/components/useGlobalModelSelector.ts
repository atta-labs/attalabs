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

// Persist last picked model locally so the next /deliberate visit pre-selects
// it. Kept client-only — matches the BYOK story (no server round trip) and is
// per-device by nature.
const LAST_MODEL_KEY = 'vada:last-model'

interface LastModel {
  provider: RouteProvider
  modelId: string
}

function readLastModel(): LastModel | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LAST_MODEL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LastModel>
    if (!parsed.provider || typeof parsed.modelId !== 'string') return null
    return { provider: parsed.provider as RouteProvider, modelId: parsed.modelId }
  } catch {
    return null
  }
}

function writeLastModel(v: LastModel | null) {
  if (typeof window === 'undefined') return
  try {
    if (v) window.localStorage.setItem(LAST_MODEL_KEY, JSON.stringify(v))
    else window.localStorage.removeItem(LAST_MODEL_KEY)
  } catch {
    // quota exceeded / disabled — harmless, move on
  }
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
  // Seeding priority:
  //   1. Team-preset saved model (if user picked a preset and it has saved models)
  //   2. Last-used model from localStorage (even if we're locked — the provider
  //      is available as long as it's in identity.state.providers; the key
  //      loads on DELIBERATE click via the existing unlock flow)
  //   3. First catalog entry whose provider currently has a key in memory
  //   4. Nothing — user picks manually
  useEffect(() => {
    if (selectedPresetId && initialTeamModels.length > 0) {
      const entry = initialTeamModels.find((m) => m.teamId === selectedPresetId)
      if (entry) {
        const route = entry.provider as RouteProvider
        const apiKey = storedKeys[route] ?? ''
        // biome-ignore lint/suspicious/noConsole: temporary diagnosis log
        console.log('[globalModel] update', {
          trigger: 'seed-mount-preset',
          provider: route,
          modelId: entry.modelId,
          apiKeySource: 'storedKeys[route]',
          apiKeyLength: apiKey.length,
          identityStateKeys: Object.keys(identity.state.keys),
          hasAnthropicInIdentity: !!identity.state.keys?.anthropic,
          anthropicKeyLength: identity.state.keys?.anthropic?.length ?? 0
        })
        onChange({ provider: route, modelId: entry.modelId, apiKey })
        return
      }
    }
    if (!value) {
      const last = readLastModel()
      if (last) {
        const providerAvailable =
          last.provider === 'ollama' || !!storedKeys[last.provider] || identity.state.providers.includes(last.provider)
        const inCatalog = baseCatalog.some((e) => e.route === last.provider && e.modelId === last.modelId)
        if (providerAvailable && inCatalog) {
          const apiKey = storedKeys[last.provider] ?? ''
          // biome-ignore lint/suspicious/noConsole: temporary diagnosis log
          console.log('[globalModel] update', {
            trigger: 'seed-mount-lastModel',
            provider: last.provider,
            modelId: last.modelId,
            apiKeySource: 'storedKeys[last.provider]',
            apiKeyLength: apiKey.length,
            identityStateKeys: Object.keys(identity.state.keys),
            hasAnthropicInIdentity: !!identity.state.keys?.anthropic,
            anthropicKeyLength: identity.state.keys?.anthropic?.length ?? 0
          })
          onChange({ provider: last.provider, modelId: last.modelId, apiKey })
          return
        }
      }
      const first = baseCatalog.find((e) => storedKeys[e.route])
      if (first) {
        const apiKey = storedKeys[first.route] ?? ''
        // biome-ignore lint/suspicious/noConsole: temporary diagnosis log
        console.log('[globalModel] update', {
          trigger: 'seed-mount-firstKeyed',
          provider: first.route,
          modelId: first.modelId,
          apiKeySource: 'storedKeys[first.route]',
          apiKeyLength: apiKey.length,
          identityStateKeys: Object.keys(identity.state.keys),
          hasAnthropicInIdentity: !!identity.state.keys?.anthropic,
          anthropicKeyLength: identity.state.keys?.anthropic?.length ?? 0
        })
        onChange({ provider: first.route, modelId: first.modelId, apiKey })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preset-switch reseed ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPresetId || initialTeamModels.length === 0) return
    const entry = initialTeamModels.find((m) => m.teamId === selectedPresetId)
    if (!entry) return
    const route = entry.provider as RouteProvider
    const apiKey = storedKeys[route] ?? ''
    // biome-ignore lint/suspicious/noConsole: temporary diagnosis log
    console.log('[globalModel] update', {
      trigger: 'preset-switch',
      provider: route,
      modelId: entry.modelId,
      apiKeySource: 'storedKeys[route]',
      apiKeyLength: apiKey.length,
      identityStateKeys: Object.keys(identity.state.keys),
      hasAnthropicInIdentity: !!identity.state.keys?.anthropic,
      anthropicKeyLength: identity.state.keys?.anthropic?.length ?? 0
    })
    onChange({ provider: route, modelId: entry.modelId, apiKey })
  }, [selectedPresetId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── storedKeys → globalModel.apiKey sync ──────────────────────────────────
  // Keeps globalModel.apiKey current whenever keys arrive asynchronously:
  // identity unlock after mount, setKey from any source (including
  // handleProvideKey when value was null and the onChange guard was false).
  useEffect(() => {
    if (!value || value.provider === 'ollama') return
    const latestKey = storedKeys[value.provider] ?? ''
    if (latestKey !== value.apiKey) {
      onChange({ ...value, apiKey: latestKey })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omits value/onChange; sync should only fire when stored keys change, not on every value/onChange identity change
  }, [storedKeys])

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

  // Persist every selection so next visit can seed from it. Effect watching
  // `value` covers all write paths (picker change, preset change, key paste)
  // without having to touch each one.
  useEffect(() => {
    if (value) writeLastModel({ provider: value.provider, modelId: value.modelId })
  }, [value?.provider, value?.modelId])

  // ── Handlers ───────────────────────────────────────────────────────────────
  // Action-triggered unlock: picking a model whose provider has a saved-but-
  // locked key fires the biometric prompt right here. After unlock we probe
  // the key, but only DROP it when the probe says `invalid_key`. Rate limits,
  // model-not-found, and transient/unreachable failures mean the key is still
  // probably valid — destroying it on those would force a re-entry for a
  // problem the user can't fix (e.g. Google quota burst).
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
            // biome-ignore lint/suspicious/noConsole: temporary diagnosis log
            console.log('[globalModel] update', {
              trigger: 'handleChange-unlock-noStoredKey',
              provider: next.route,
              modelId: next.modelId,
              apiKeySource: 'storedKey-missing',
              apiKeyLength: 0,
              identityStateKeys: Object.keys(identity.state.keys),
              hasAnthropicInIdentity: !!identity.state.keys?.anthropic,
              anthropicKeyLength: identity.state.keys?.anthropic?.length ?? 0
            })
            onChange({ provider: next.route, modelId: next.modelId, apiKey: storedKey ?? '' })
            return
          }
          const probe = await probeProviderKey(next.route, storedKey, next.modelId)
          if (probe.kind === 'invalid_key') {
            identity.removeKey(next.route)
            errorToast(
              `Your saved ${next.route} key is invalid`,
              `Open the picker and select ${next.route} again to paste a fresh key.`,
              10000
            )
            return
          }
          // Keep the key. For non-ok but non-invalid probes, load it anyway
          // and warn — the user's next deliberation attempt may still work.
          if (!probe.ok) {
            errorToast(
              `${next.route} reachable, but probe warned`,
              probe.error ?? 'Key loaded, but the probe returned a non-success response.',
              6000
            )
          } else {
            successToast('Unlocked', `Your ${next.route} key is loaded for this session.`)
          }
          // biome-ignore lint/suspicious/noConsole: temporary diagnosis log
          console.log('[globalModel] update', {
            trigger: 'handleChange-unlock-withKey',
            provider: next.route,
            modelId: next.modelId,
            apiKeySource: 'freshKeys[route]',
            apiKeyLength: storedKey.length,
            identityStateKeys: Object.keys(identity.state.keys),
            hasAnthropicInIdentity: !!identity.state.keys?.anthropic,
            anthropicKeyLength: identity.state.keys?.anthropic?.length ?? 0
          })
          onChange({ provider: next.route, modelId: next.modelId, apiKey: storedKey })
        } catch (e) {
          errorToast('Could not unlock', e instanceof Error ? e.message : 'Try again or enter keys manually.')
        }
        return
      }
      const apiKey = storedKeys[next.route] ?? ''
      // biome-ignore lint/suspicious/noConsole: temporary diagnosis log
      console.log('[globalModel] update', {
        trigger: 'handleChange-noUnlock',
        provider: next.route,
        modelId: next.modelId,
        apiKeySource: 'storedKeys[route]',
        apiKeyLength: apiKey.length,
        identityStateKeys: Object.keys(identity.state.keys),
        hasAnthropicInIdentity: !!identity.state.keys?.anthropic,
        anthropicKeyLength: identity.state.keys?.anthropic?.length ?? 0
      })
      onChange({ provider: next.route, modelId: next.modelId, apiKey })
    },
    [identity, storedKeys, onChange, successToast, errorToast]
  )

  // Probe the key against the provider before persisting. We REJECT only on
  // `invalid_key` — the user pasted something bogus. For rate-limit /
  // model-not-found / unreachable, accept the key (it's fine; the environment
  // is the problem) but warn so the user knows their next run may fail.
  const handleProvideKey = useCallback(
    async (route: RouteProvider, key: string) => {
      const modelId = value?.provider === route ? value.modelId : undefined
      const probe = await probeProviderKey(route, key, modelId)
      if (probe.kind === 'invalid_key') {
        throw new Error(probe.error ?? 'Invalid API key.')
      }
      identity.setKey(route, key)
      // biome-ignore lint/suspicious/noConsole: temporary diagnosis log
      console.log('[globalModel] update', {
        trigger: 'handleProvideKey',
        provider: route,
        modelId: value?.modelId,
        apiKeySource: 'key-direct',
        apiKeyLength: key.length,
        valueProviderMatchesRoute: value?.provider === route,
        identityStateKeys: Object.keys(identity.state.keys),
        hasAnthropicInIdentity: !!identity.state.keys?.anthropic,
        anthropicKeyLength: identity.state.keys?.anthropic?.length ?? 0
      })
      if (value?.provider === route) onChange({ ...value, apiKey: key })
      if (probe.ok) {
        successToast('Key verified', `${route} is ready to use.`)
      } else {
        successToast(
          `${route} saved with a warning`,
          probe.error ?? 'Key stored; provider returned a non-success probe.'
        )
      }
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
