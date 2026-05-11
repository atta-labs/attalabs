'use client'

// All state + effects + async handlers for GlobalModelSelector. The component
// is pure presentation that reads the returned object.

import { fetchInstalledOllamaModels, probeProviderKey } from '@atta/identity'
import { type ModelEntry, type VendorId, useCatalog } from '@atta/models'
import { useToastContext } from '@atta/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReviewerConfig, setReviewerConfig } from '@/lib/reviewer-models'
import type { ModelSelection } from './GlobalModelSelector'

interface UseGlobalModelSelectorProps {
  value: ModelSelection | null
  onChange: (v: ModelSelection | null) => void
  settingsProviders: string[]
  selectedSpecId: string | undefined
  /** Agent names for the active spec — used to write one model for all agents. */
  specAgentNames: string[]
}

export function useGlobalModelSelector({
  value,
  onChange,
  settingsProviders,
  selectedSpecId,
  specAgentNames
}: UseGlobalModelSelectorProps) {
  const baseCatalog = useCatalog()
  const { successToast } = useToastContext()
  const router = useRouter()

  // Providers saved in this session via the inline key-entry dialog
  const [sessionSavedProviders, setSessionSavedProviders] = useState<VendorId[]>([])

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
  const catalog = useMemo(() => {
    const base =
      ollamaReachable && installedOllama !== null && installedOllama.length > 0
        ? [...baseCatalog.filter((e) => e.route !== 'ollama'), ...installedOllama]
        : baseCatalog
    return process.env.NODE_ENV === 'production' ? base.filter((e) => e.route !== 'ollama') : base
  }, [baseCatalog, ollamaReachable, installedOllama])

  // ── Derived picker inputs ──────────────────────────────────────────────────
  const configuredRoutes = useMemo(() => {
    const set = new Set<VendorId>([...(settingsProviders as VendorId[]), ...sessionSavedProviders])
    if (ollamaReachable) set.add('ollama')
    if (process.env.NODE_ENV === 'production') set.delete('ollama')
    return set
  }, [settingsProviders, sessionSavedProviders, ollamaReachable])

  const pickerValue = useMemo(() => (value ? { route: value.provider, modelId: value.modelId } : null), [value])

  // ── Per-team seeding ──────────────────────────────────────────────────────
  // Reads from the unified vada:team:<specId> storage (same key/format as the
  // reviewer modal). Takes the first agent's model to seed the picker — for
  // non-editable teams all agents share the same model anyway.
  useEffect(() => {
    if (!selectedSpecId) return
    const stored = getReviewerConfig(selectedSpecId)
    const firstAgent = specAgentNames[0]
    const modelId = firstAgent ? stored?.[firstAgent] : undefined
    if (modelId) {
      const entry = baseCatalog.find((e) => e.modelId === modelId)
      if (entry) {
        const providerAvailable = entry.route === 'ollama' || configuredRoutes.has(entry.route)
        if (providerAvailable) {
          onChange({ provider: entry.route, modelId: entry.modelId, apiKey: '' })
          return
        }
      }
    }
    onChange(null)
  }, [selectedSpecId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (next: { route: VendorId; modelId: string }) => {
      // Write immediately so the sphere display refreshes in the same render
      // cycle. The format is the same as the reviewer modal — agentName → modelId.
      if (selectedSpecId && specAgentNames.length > 0) {
        const config = Object.fromEntries(specAgentNames.map((n) => [n, next.modelId]))
        setReviewerConfig(selectedSpecId, config)
      }
      onChange({ provider: next.route, modelId: next.modelId, apiKey: '' })
    },
    [onChange, selectedSpecId, specAgentNames]
  )

  // Probe the key against the provider before persisting. We REJECT only on
  // `invalid_key` — the user pasted something bogus. For rate-limit /
  // model-not-found / unreachable, accept the key (it's fine; the environment
  // is the problem) but warn so the user knows their next run may fail.
  const handleProvideKey = useCallback(
    async (route: VendorId, key: string) => {
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
    pickerValue,
    handleChange,
    handleProvideKey
  }
}
