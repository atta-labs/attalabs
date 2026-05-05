'use client'

// All state + effects + async handlers for GlobalModelSelector. The component
// is pure presentation that reads the returned object.

import { fetchInstalledOllamaModels, probeProviderKey } from '@atta/identity'
import { type ModelEntry, type RouteProvider, useCatalog } from '@atta/models'
import { useToastContext } from '@atta/ui'
import { useRouter } from 'next/navigation'
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

// Per-team picked model, persisted client-side so each team remembers its own
// selection. Keyed by spec.id — switching teams loads that team's last pick.
const TEAM_MODEL_KEY_PREFIX = 'vada:team-model:'

interface LastModel {
  provider: RouteProvider
  modelId: string
}

function readTeamModel(specId: string): LastModel | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TEAM_MODEL_KEY_PREFIX + specId)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LastModel>
    if (!parsed.provider || typeof parsed.modelId !== 'string') return null
    return { provider: parsed.provider as RouteProvider, modelId: parsed.modelId }
  } catch {
    return null
  }
}

function writeTeamModel(specId: string, v: LastModel | null) {
  if (typeof window === 'undefined') return
  try {
    if (v) window.localStorage.setItem(TEAM_MODEL_KEY_PREFIX + specId, JSON.stringify(v))
    else window.localStorage.removeItem(TEAM_MODEL_KEY_PREFIX + specId)
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
  const router = useRouter()

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

  // ── Per-team seeding ──────────────────────────────────────────────────────
  // Runs on mount AND every time selectedSpecId changes. Configs are PER TEAM
  // — switching teams must load that team's saved pick, not bleed the previous
  // team's selection across.
  // Seeding priority for the active team:
  //   1. Team-preset saved model (DB, set via Teams tab if present)
  //   2. Last pick for THIS team (localStorage)
  //   3. Cleared — user picks manually for this team
  useEffect(() => {
    if (!selectedSpecId) return
    const teamId = SPEC_ID_TO_TEAM_ID[selectedSpecId]
    const dbEntry = teamId ? initialTeamModels.find((m) => m.teamId === teamId) : undefined
    if (dbEntry) {
      onChange({ provider: dbEntry.provider as RouteProvider, modelId: dbEntry.modelId, apiKey: '' })
      return
    }
    const stored = readTeamModel(selectedSpecId)
    if (stored) {
      const providerAvailable = stored.provider === 'ollama' || configuredRoutes.has(stored.provider)
      const inCatalog = baseCatalog.some((e) => e.route === stored.provider && e.modelId === stored.modelId)
      if (providerAvailable && inCatalog) {
        onChange({ provider: stored.provider, modelId: stored.modelId, apiKey: '' })
        return
      }
    }
    onChange(null)
  }, [selectedSpecId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist every selection under the active team's key so switching back
  // restores that team's pick.
  useEffect(() => {
    if (!selectedSpecId) return
    if (value) writeTeamModel(selectedSpecId, { provider: value.provider, modelId: value.modelId })
    else writeTeamModel(selectedSpecId, null)
  }, [selectedSpecId, value?.provider, value?.modelId])

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
      // Re-run the server component so configuredProviders prop reflects the
      // newly saved key. Without this, the panel keeps showing locked spheres
      // because page.tsx fetched configuredProviders before this key existed.
      router.refresh()
      if (probe.ok) {
        successToast('Key verified', `${route} is ready to use.`)
      } else {
        successToast(
          `${route} saved with a warning`,
          probe.error ?? 'Key stored; provider returned a non-success probe.'
        )
      }
    },
    [value, onChange, successToast, router]
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
