'use client'

import type { Flow } from '@atta/engine'
import { useCatalog } from '@atta/models'
import { useToastContext } from '@atta/ui/components'
import type { FaceStyle } from '@/components/agents'
import type { ReviewerConfig } from '@/lib/reviewer-models'
import { getReviewerConfig, resolveVendor, setReviewerConfig, validateKeysForConfig } from '@/lib/reviewer-models'
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
  specs: Flow[]
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
  /**
   * True when the input has non-empty text. Split out from `canStart` so the
   * hero's morphing button can render at all (Gemini-style empty state: no
   * button visible until the user types).
   */
  hasQuestion: boolean
  /**
   * True when the selected team is ready to receive a submission — either
   * the saved reviewer config validates against current keys (editable specs),
   * or all agent vendors for the spec have keys (non-editable specs). Split out
   * so the morphing button can decide submit-vs-configure independently of
   * whether there is text to submit.
   */
  isConfigValid: boolean
  needsUnlock: boolean
  hasAnyKey: boolean
  benchmarkEnabled: boolean
  setBenchmarkEnabled: (v: boolean) => void
  handleStart: () => Promise<void>
  /** Submit with an explicit question text — used by SmartPromptInput which owns its own value. */
  handleStartWithText: (q: string) => Promise<void>
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
  const router = useRouter()
  const { errorToast } = useToastContext()
  const { faceStyle } = useUserPreferences()
  // Catalog drives vendor resolution for arbitrary models (Groq, DeepSeek, etc.)
  // so we don't whack-a-mole prefix lists for every new provider in models.dev.
  const catalog = useCatalog()

  // Stable ref for selectedSpecId — used by modal save callback
  const selectedSpecIdRef = useRef(selectedSpecId)
  selectedSpecIdRef.current = selectedSpecId

  // Stable ref for question — read synchronously in handleModalSave to check
  // whether to auto-dispatch after save, without creating a stale closure dep.
  const questionRef = useRef(question)
  questionRef.current = question

  useEffect(() => {
    if (initialError) errorToast('Could not start deliberation', initialError)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // NOTE: Previously auto-cleared reviewer configs whose vendor keys weren't in
  // `configuredProviders`. Disabled because `configuredProviders` is server-fetched
  // at page load and doesn't refresh after the user adds a key inline (modal /
  // popover "Provide Key"). The effect would wipe just-saved configs, leaving empty
  // spheres. Lock badges in the panel already signal misconfigured slots — the user
  // can re-pick or remove keys explicitly.

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
    return validateKeysForConfig(config, configuredProviders, catalog)
  })()

  // For non-editable specs: check all agents' effective model vendors have keys.
  // Effective model = global override (if set) or the agent's YAML default.
  const hasKeysForNonEditableSpec = (() => {
    if (!currentSpec) return false
    if (globalModel) {
      if (globalModel.provider === 'ollama') return true
      return configuredProviders.includes(globalModel.provider)
    }
    const agentNames = currentSpec.rounds[0]?.agents.map((a) => a.name) ?? currentSpec.agents.map((a) => a.name)
    const agentMap = new Map(currentSpec.agents.map((a) => [a.name, a]))
    const defaultModel = currentSpec.defaults.model ?? ''
    return agentNames.every((name) => {
      const model = agentMap.get(name)?.model ?? defaultModel
      if (!model) return false
      const vendor = resolveVendor(model, catalog)
      if (!vendor) return false
      return configuredProviders.includes(vendor)
    })
  })()

  // ── Predicate split (Gemini-style morphing button) ──
  // `hasQuestion` answers "is there text to submit?" — purely an input-state
  // signal. `isConfigValid` answers "is the team ready to receive a submission?"
  // — purely a team/keys signal. They are independent: the hero needs to know
  // both so it can decide whether to render the button at all (`hasQuestion`)
  // AND, when rendered, whether clicking it submits or opens the config modal
  // (`isConfigValid`). `canStart` keeps the composite meaning for existing
  // callers (the bottom-bar "Deliberate" CTA, the dispatch handlers).
  const hasQuestion = !!question.trim()
  const isConfigValid = hasEditableAgents ? hasValidReviewerConfig : hasKeysForNonEditableSpec
  const canStart = hasQuestion && remainingToday > 0 && !loading && isConfigValid

  // Core dispatch — skips the reviewer config gate (used post-modal-save).
  // Accepts an optional explicit question text (used by SmartPromptInput submit path
  // where the component owns its own value and passes it via onSubmit).
  //
  // Stale-closure note: for editable specs we re-read `getReviewerConfig` from
  // localStorage and re-run `validateKeysForConfig` HERE instead of trusting
  // the render-closure `hasValidReviewerConfig` flag. This matters because
  // `handleModalSave` writes the config to localStorage and then calls
  // `dispatchRef.current()` synchronously — that call uses the dispatchRef
  // assigned during the PREVIOUS render, whose `hasValidReviewerConfig`
  // closure was computed before the localStorage write. Reading freshly
  // guarantees the post-save auto-dispatch sees the just-persisted config.
  const dispatchRef = useRef<(overrideQuestion?: string) => Promise<void>>(() => Promise.resolve())
  dispatchRef.current = async (overrideQuestion?: string) => {
    const effectiveQuestion = (overrideQuestion ?? question).trim()
    const reviewerConfigValid = hasEditableAgents
      ? (() => {
          const fresh = getReviewerConfig(selectedSpecId)
          return !!fresh && validateKeysForConfig(fresh, configuredProviders, catalog)
        })()
      : true
    const effectiveCanStart =
      !!effectiveQuestion &&
      remainingToday > 0 &&
      !loading &&
      (hasEditableAgents ? reviewerConfigValid : hasKeysForNonEditableSpec)
    if (!effectiveCanStart) return
    setLoading(true)

    // The apiKey is not sent to /start. The deliberation page passes it to
    // /workflow/run?stream=true when the SSE stream opens. See /trust.

    // Lift the saved reviewer config (per-slot model picks from the modal)
    // onto the /start payload as `agentModels: { [yamlName]: {provider,
    // modelId} }`. Server-side `start/route.ts` overlays this on its own
    // spec-default map (keyed by `AGENTS[name]?.role ?? name`), so we keep
    // the raw YAML names here — server normalizes. Provider is resolved
    // through `resolveVendor(modelId, catalog)`, which is catalog-authoritative
    // (vs prefix-only) — handles cross-vendor cases like Groq-served DeepSeek
    // where prefix matching would mis-route. Entries with no resolvable
    // vendor are skipped: writing `provider: null` would break Zod validation
    // server-side, and they wouldn't be runnable either way.
    const reviewerConfig = getReviewerConfig(selectedSpecId)
    let agentModels: Record<string, { provider: string; modelId: string }> | undefined
    if (reviewerConfig) {
      const entries: Array<[string, { provider: string; modelId: string }]> = []
      for (const [agentName, modelId] of Object.entries(reviewerConfig)) {
        const provider = resolveVendor(modelId, catalog)
        if (!provider) continue
        entries.push([agentName, { provider, modelId }])
      }
      if (entries.length > 0) agentModels = Object.fromEntries(entries)
    }

    const body: Record<string, unknown> = {
      question: effectiveQuestion,
      specId: selectedSpecId,
      ...(globalModel && {
        provider: globalModel.provider,
        modelId: globalModel.modelId
      }),
      ...(agentModels && { agentModels }),
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
        void fireBaselineBenchmark(session_id, effectiveQuestion, { ...globalModel, apiKey: baselineApiKey })
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
  const handleStartImplRef = useRef<(overrideQuestion?: string) => Promise<void>>(() => Promise.resolve())
  handleStartImplRef.current = async (overrideQuestion?: string) => {
    const effectiveQuestion = (overrideQuestion ?? question).trim()
    // Empty input → silently no-op. Quota/loading gates are also hard no-ops
    // (the user already sees a toast for the quota case; loading is transient).
    if (!effectiveQuestion || remainingToday <= 0 || loading) return
    // For specs with editable reviewer agents, missing/invalid config opens the
    // modal instead of silently no-op'ing. This matches the morphing button's
    // click behavior: text + invalid config → configure modal (both via mouse
    // and via Cmd+Enter through this code path).
    const spec = specs.find((s) => s.id === selectedSpecId)
    if (spec) {
      const editableAgents = spec.agents.filter((a) => a.editable)
      if (editableAgents.length > 0) {
        const config = getReviewerConfig(selectedSpecId)
        if (!config || !validateKeysForConfig(config, configuredProviders, catalog)) {
          setShowReviewerModal(true)
          return
        }
      } else if (!hasKeysForNonEditableSpec) {
        // Non-editable spec with missing vendor keys — no modal exists to
        // configure (the user adds keys via /settings). Silent no-op preserves
        // the existing behavior; the bottom-bar "Deliberate" button is disabled
        // in this state and the hero button click never reaches here (it
        // doesn't have a configure path for non-editable specs).
        return
      }
    }
    await dispatchRef.current(overrideQuestion)
  }
  const handleStart = useCallback(() => handleStartImplRef.current(), [])
  const handleStartWithText = useCallback((q: string) => handleStartImplRef.current(q), [])

  const handleModalSave = useCallback((config: ReviewerConfig) => {
    setReviewerConfig(selectedSpecIdRef.current, config)
    setShowReviewerModal(false)
    // Post-save auto-dispatch: if a question is already entered, fire immediately
    // now that the config is saved. dispatchRef.current re-validates internally
    // using the just-persisted config, so we pass no override.
    const currentQuestion = questionRef.current.trim()
    if (currentQuestion) {
      void dispatchRef.current()
    }
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
    hasQuestion,
    isConfigValid,
    needsUnlock,
    hasAnyKey,
    benchmarkEnabled,
    setBenchmarkEnabled,
    handleStart,
    handleStartWithText,
    faceStyle,
    showReviewerModal,
    handleModalSave,
    closeReviewerModal,
    openReviewerModal
  }
}
