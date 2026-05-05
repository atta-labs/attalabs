'use client'

import type { DeliberationSpec } from '@atta/engine'
import { useToastContext } from '@atta/ui'
import type { FaceStyle } from '@/components/agents'
import type { ReviewerConfig } from '@/lib/reviewer-models'
import { clearReviewerConfig, getReviewerConfig, resolveVendor, setReviewerConfig, validateKeysForConfig } from '@/lib/reviewer-models'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUserPreferences } from '@/lib/user-preferences-context'
import type { ModelSelection } from './GlobalModelSelector'

// Fire-and-forget — POST to server-side route so the LLM call happens
// server-side (Anthropic blocks browser-origin streaming at CORS preflight).
// apiKey transits server memory only, per /trust.
async function fireBaselineBenchmark(sessionId: string, question: string, model: ModelSelection): Promise<void> {
  const apiKey = model.provider === 'ollama' ? 'ollama-local' : model.apiKey
  if (!apiKey) return
  try {
    await fetch('/api/benchmark/baseline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        question,
        provider: model.provider,
        modelId: model.modelId,
        apiKey
      })
    })
  } catch (e) {
    console.warn('[benchmark] baseline call failed', e)
  }
}

const LAST_TEAM_KEY = 'vada:lastSelectedTeam'

function readLastTeam(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(LAST_TEAM_KEY)
  } catch {
    return null
  }
}

function writeLastTeam(id: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAST_TEAM_KEY, id)
  } catch {
    // quota exceeded / disabled — harmless
  }
}

interface UseDeliberateFormProps {
  remainingToday: number
  dailyLimit: number
  initialError?: string
  configuredProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
  specs: DeliberationSpec[]
  initialTeamId?: string
}

export interface DeliberateFormState {
  question: string
  setQuestion: (q: string) => void
  selectedSpecId: string
  setSelectedSpecId: (id: string) => void
  globalModel: ModelSelection | null
  setGlobalModel: (m: ModelSelection | null) => void
  loading: boolean
  canStart: boolean
  needsUnlock: boolean
  hasAnyKey: boolean
  benchmarkEnabled: boolean
  setBenchmarkEnabled: (v: boolean) => void
  handleStart: () => Promise<void>
  faceStyle: FaceStyle
  showReviewerModal: boolean
  handleModalSave: (config: ReviewerConfig) => void
  closeReviewerModal: () => void
  openReviewerModal: () => void
}

export function useDeliberateForm({
  remainingToday,
  dailyLimit,
  initialError,
  specs,
  initialTeamId,
  configuredProviders
}: UseDeliberateFormProps): DeliberateFormState {
  const [question, setQuestion] = useState('')
  const [selectedSpecId, setSelectedSpecId] = useState<string>(() => {
    const first = specs[0]
    if (!first) {
      throw new Error('useDeliberateForm: no specs available; cannot initialize selectedSpecId')
    }
    // URL param takes priority. localStorage is read in useEffect to avoid SSR/client mismatch.
    if (initialTeamId && specs.some((s) => s.id === initialTeamId)) return initialTeamId
    return first.id
  })

  // Hydrate from localStorage after mount — runs client-only so SSR and initial
  // client render always agree on the server-safe value above.
  useEffect(() => {
    if (initialTeamId) return
    const stored = readLastTeam()
    if (stored && specs.some((s) => s.id === stored)) setSelectedSpecId(stored)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [globalModel, setGlobalModel] = useState<ModelSelection | null>(null)
  const [loading, setLoading] = useState(false)
  const [benchmarkEnabled, setBenchmarkEnabled] = useState(true)
  const [showReviewerModal, setShowReviewerModal] = useState(false)
  // Bumped whenever stale configs are cleared — causes DeliberatePanel to re-read localStorage.
  const [_clearEpoch, setClearEpoch] = useState(0)
  const router = useRouter()
  const { errorToast } = useToastContext()
  const { faceStyle } = useUserPreferences()

  // Stable ref for selectedSpecId — used by modal save callback
  const selectedSpecIdRef = useRef(selectedSpecId)
  selectedSpecIdRef.current = selectedSpecId

  useEffect(() => {
    if (initialError) errorToast('Could not start deliberation', initialError)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-clear saved reviewer configs whose models' vendor keys no longer exist
  // server-side. Runs on mount and whenever configuredProviders changes (e.g.
  // after the user deletes a key in Settings and navigates back here).
  useEffect(() => {
    const prefix = 'vada:reviewer-models:'
    const staleSpecIds = Object.keys(window.localStorage)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
      .filter((specId) => {
        const config = getReviewerConfig(specId)
        return config !== null && !validateKeysForConfig(config, configuredProviders)
      })

    if (staleSpecIds.length > 0) {
      for (const specId of staleSpecIds) {
        clearReviewerConfig(specId)
      }
      setClearEpoch((n) => n + 1)
    }
  }, [configuredProviders])

  // Surface the daily-limit state explicitly. Without a toast, the Deliberate
  // buttons just grey out and the user is left guessing why nothing happens.
  useEffect(() => {
    if (remainingToday <= 0) {
      errorToast(
        'Daily deliberation limit reached',
        `You have used all ${dailyLimit} deliberations for today. The counter resets at midnight (UTC).`,
        8000
      )
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist team selection so next visit pre-selects the last used team.
  useEffect(() => {
    writeLastTeam(selectedSpecId)
  }, [selectedSpecId])

  const selectedProvider = globalModel?.provider
  const needsUnlock = false
  const hasAnyKey = configuredProviders.length > 0 || selectedProvider === 'ollama'

  // For specs with editable reviewer agents (e.g. Reviewers team), the global
  // model picker is irrelevant — each agent has its own model configured via
  // the ReviewerConfigModal. Don't gate canStart on hasKeyForSelected for these
  // specs; the modal will enforce key presence before dispatching.
  const currentSpec = specs.find((s) => s.id === selectedSpecId)
  const hasEditableAgents = currentSpec?.agents.some((a) => a.editable) ?? false

  // For editable specs: reviewer config must be saved and keys must be present.
  const hasValidReviewerConfig = (() => {
    if (!hasEditableAgents) return false
    const config = getReviewerConfig(selectedSpecId)
    if (!config) return false
    return validateKeysForConfig(config, configuredProviders)
  })()

  // For non-editable specs: check all agents' effective model vendors have keys.
  // Effective model = global override (if set) or the agent's YAML default.
  const hasKeysForNonEditableSpec = (() => {
    if (!currentSpec) return false
    if (globalModel) {
      if (globalModel.provider === 'ollama') return true
      return configuredProviders.includes(globalModel.provider)
    }
    const agentNames = currentSpec.flow?.rounds?.agents ?? currentSpec.agents.map((a) => a.name)
    const agentMap = new Map(currentSpec.agents.map((a) => [a.name, a]))
    const defaultModel = currentSpec.defaults.model ?? ''
    return agentNames.every((name) => {
      const model = agentMap.get(name)?.model ?? defaultModel
      if (!model) return false
      const vendor = resolveVendor(model)
      if (!vendor) return false
      return configuredProviders.includes(vendor)
    })
  })()

  const canStart =
    !!question.trim() &&
    remainingToday > 0 &&
    !loading &&
    (hasEditableAgents ? hasValidReviewerConfig : hasKeysForNonEditableSpec)

  // Core dispatch — skips the reviewer config gate (used post-modal-save).
  const dispatchRef = useRef<() => Promise<void>>(() => Promise.resolve())
  dispatchRef.current = async () => {
    if (!canStart) return
    setLoading(true)

    // The apiKey is not sent to /start. The deliberation page passes it to
    // /workflow/run?stream=true when the SSE stream opens. See /trust.
    const body: Record<string, unknown> = {
      question: question.trim(),
      specId: selectedSpecId,
      ...(globalModel && {
        provider: globalModel.provider,
        modelId: globalModel.modelId
      }),
      benchmark: benchmarkEnabled
    }

    const res = await fetch('/api/deliberation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const data = await res.json()
      errorToast('Failed to start deliberation', data.error ?? undefined)
      setLoading(false)
      return
    }

    const { session_id } = await res.json()

    // If benchmark was enabled AND we have a usable model selection, fire the
    // baseline call in parallel. Intentionally NOT awaited — the user
    // navigates immediately; the fetch settles in the background.
    if (benchmarkEnabled && globalModel) {
      const baselineApiKey = globalModel.provider === 'ollama' ? 'ollama-local' : globalModel.apiKey || undefined
      if (baselineApiKey) {
        void fireBaselineBenchmark(session_id, question.trim(), { ...globalModel, apiKey: baselineApiKey })
      }
    }

    router.push(`/deliberation/${session_id}`)
  }

  // Ref-pattern for a truly stable handleStart reference. If we used a plain
  // useCallback with [question, benchmarkEnabled, ...] deps, the ref would
  // change on every keystroke and defeat the memo on TeamCardGrid, causing
  // the agent spheres to flicker on input. The ref-indirection keeps the
  // exposed callback's identity stable across renders while always calling
  // the latest closure (which sees fresh state).
  const handleStartImplRef = useRef<() => Promise<void>>(() => Promise.resolve())
  handleStartImplRef.current = async () => {
    if (!canStart) return
    // For specs with editable reviewer agents, gate on a valid stored config.
    // If the config is missing or stale keys, show the modal instead of dispatching.
    const spec = specs.find((s) => s.id === selectedSpecId)
    if (spec) {
      const editableAgents = spec.agents.filter((a) => a.editable)
      if (editableAgents.length > 0) {
        const config = getReviewerConfig(selectedSpecId)
        if (!config || !validateKeysForConfig(config, configuredProviders)) {
          setShowReviewerModal(true)
          return
        }
      }
    }
    await dispatchRef.current()
  }
  const handleStart = useCallback(() => handleStartImplRef.current(), [])

  const handleModalSave = useCallback((config: ReviewerConfig) => {
    setReviewerConfig(selectedSpecIdRef.current, config)
    setShowReviewerModal(false)
  }, [])

  const closeReviewerModal = useCallback(() => setShowReviewerModal(false), [])
  const openReviewerModal = useCallback(() => setShowReviewerModal(true), [])

  return {
    question,
    setQuestion,
    selectedSpecId,
    setSelectedSpecId,
    globalModel,
    setGlobalModel,
    loading,
    canStart,
    needsUnlock,
    hasAnyKey,
    benchmarkEnabled,
    setBenchmarkEnabled,
    handleStart,
    faceStyle,
    showReviewerModal,
    handleModalSave,
    closeReviewerModal,
    openReviewerModal
  }
}
