'use client'

// All state + effects + async handlers for GlobalModelSelector. The component
// is pure presentation that reads the returned object.

import { fetchInstalledOllamaModels, probeProviderKey } from '@atta/identity'
import { type ModelEntry, type RouteProvider, useCatalog } from '@atta/models'
import { useToastContext } from '@atta/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SPEC_ID_TO_TEAM_ID } from '@/lib/teams-metadata'
import type { ModelSelection } from './GlobalModelSelector'

interface UseGlobalModelSelectorProps {
  value: ModelSelection | null
  onChange: (v: ModelSelection | null) => void
  settingsProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
  selectedSpecId: string | undefined
}

// Persist last picked model locally so the next /deliberate visit pre-selects
// it. Kept client-only — matches the server-side key story (no round trip) and
// is per-device by nature.
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
  selectedSpecId
}: UseGlobalModelSelectorProps) {
  const baseCatalog = useCatalog()
  const { successToast } = useToastContext()

  // Providers saved in this session via the inline key-entry dialog
  const [sessionSavedProviders, setSessionSavedProviders] = useState<RouteProvider[]>([])

  // ── Ollama live model fetch ────────────────────────────────────────────────
  // /api/tags on mount. null = not probed, empty = reachable but nothing
  // installed, non-empty = replace hardcoded defaults in the catalog.
  // Skipped in production — Ollama runs locally only and the CORS preflight
  // failure would log a console error on every prod page load for no gain.
  const [installedOllama, setInstalledOllama] = useState<ModelEntry[] | null>(null)
  const [ollamaReachable, setOllamaReachable] = useState<boolean | null>(null)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      setInstalledOllama([])
      setOllamaReachable(false)
      return
    }
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
  // In production, strip all Ollama entries — Ollama is local-only and has no
  // place in the picker when the server is Vercel.
  const catalog = useMemo(() => {
    const base =
      ollamaReachable && installedOllama !== null && installedOllama.length > 0
        ? [...baseCatalog.filter((e) => e.route !== 'ollama'), ...installedOllama]
        : baseCatalog
    return process.env.NODE_ENV === 'production' ? base.filter((e) => e.route !== 'ollama') : base
  }, [baseCatalog, ollamaReachable, installedOllama])

  // ── Derived picker inputs ──────────────────────────────────────────────────
  const configuredRoutes = useMemo(() => {
    const set = new Set<RouteProvider>([...(settingsProviders as RouteProvider[]), ...sessionSavedProviders])
    if (ollamaReachable) set.add('ollama')
    if (process.env.NODE_ENV === 'production') set.delete('ollama')
    return set
  }, [settingsProviders, sessionSavedProviders, ollamaReachable])

  const routeHints = useMemo<Partial<Record<RouteProvider, string>>>(() => ({}), [])

  const pickerValue = useMemo(() => (value ? { route: value.provider, modelId: value.modelId } : null), [value])

  // ── Preset / default seeding on mount ──────────────────────────────────────
  // Seeding priority:
  //   1. Team-preset saved model (if user picked a preset and it has saved models)
  //   2. Last-used model from localStorage (if provider is configured)
  //   3. First catalog entry whose provider is configured
  //   4. Nothing — user picks manually
  useEffect(() => {
    if (selectedSpecId && initialTeamModels.length > 0) {
      const teamId = SPEC_ID_TO_TEAM_ID[selectedSpecId]
      const entry = teamId ? initialTeamModels.find((m) => m.teamId === teamId) : undefined
      if (entry) {
        const route = entry.provider as RouteProvider
        onChange({ provider: route, modelId: entry.modelId, apiKey: '' })
        return
      }
    }
    if (!value) {
      const last = readLastModel()
      if (last) {
        const providerAvailable = last.provider === 'ollama' || configuredRoutes.has(last.provider)
        const inCatalog = baseCatalog.some((e) => e.route === last.provider && e.modelId === last.modelId)
        if (providerAvailable && inCatalog) {
          onChange({ provider: last.provider, modelId: last.modelId, apiKey: '' })
          return
        }
      }
      const first = baseCatalog.find((e) => configuredRoutes.has(e.route))
      if (first) {
        onChange({ provider: first.route, modelId: first.modelId, apiKey: '' })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Spec-switch reseed ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSpecId || initialTeamModels.length === 0) return
    const teamId = SPEC_ID_TO_TEAM_ID[selectedSpecId]
    const entry = teamId ? initialTeamModels.find((m) => m.teamId === teamId) : undefined
    if (!entry) return
    const route = entry.provider as RouteProvider
    onChange({ provider: route, modelId: entry.modelId, apiKey: '' })
  }, [selectedSpecId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist every selection so next visit can seed from it.
  useEffect(() => {
    if (value) writeLastModel({ provider: value.provider, modelId: value.modelId })
  }, [value?.provider, value?.modelId])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (next: { route: RouteProvider; modelId: string }) => {
      onChange({ provider: next.route, modelId: next.modelId, apiKey: '' })
    },
    [onChange]
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
      const res = await fetch('/api/keys/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: route, key })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as Record<string, string>).error ?? 'Failed to save key.')
      }
      setSessionSavedProviders((prev) => (prev.includes(route) ? prev : [...prev, route]))
      if (value?.provider === route) onChange({ ...value, apiKey: '' })
      if (probe.ok) {
        successToast('Key verified', `${route} is ready to use.`)
      } else {
        successToast(
          `${route} saved with a warning`,
          probe.error ?? 'Key stored; provider returned a non-success probe.'
        )
      }
    },
    [value, onChange, successToast]
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
