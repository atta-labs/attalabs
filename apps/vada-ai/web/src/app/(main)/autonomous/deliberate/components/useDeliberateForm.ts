'use client'

import { useIdentity } from '@atta/identity/react'
import { useToastContext } from '@atta/ui'
import type { FaceStyle } from '@/components/agents'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUserPreferences } from '@/lib/user-preferences-context'
import { PRESETS, type Preset } from '@/schemas'
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

interface UseDeliberateFormProps {
  remainingToday: number
  dailyLimit: number
  initialError?: string
  configuredProviders: string[]
  initialTeamModels: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
}

export interface DeliberateFormState {
  question: string
  setQuestion: (q: string) => void
  selectedPreset: Preset
  setSelectedPreset: (p: Preset) => void
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
}

export function useDeliberateForm({
  remainingToday,
  dailyLimit,
  initialError
}: UseDeliberateFormProps): DeliberateFormState {
  const [question, setQuestion] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]!)
  const [globalModel, setGlobalModel] = useState<ModelSelection | null>(null)
  const [loading, setLoading] = useState(false)
  const [benchmarkEnabled, setBenchmarkEnabled] = useState(true)
  const router = useRouter()
  const { errorToast } = useToastContext()
  const { faceStyle } = useUserPreferences()
  const identity = useIdentity()

  useEffect(() => {
    if (initialError) errorToast('Could not start deliberation', initialError)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const selectedProvider = globalModel?.provider
  // Ollama runs locally with no auth — treat as always-keyed from the
  // browser's perspective. If the server isn't running, the deliberation
  // turn will surface a clear "Could not reach Ollama" error.
  const hasKeyInMemory =
    selectedProvider === 'ollama' ||
    (selectedProvider != null && (identity.hasKey(selectedProvider) || !!globalModel?.apiKey))
  // Selected provider is saved-on-device but credentials aren't unlocked yet.
  // DELIBERATE can still run — we'll unlock biometrically on click.
  const needsUnlock =
    !hasKeyInMemory &&
    selectedProvider != null &&
    identity.state.kind === 'locked' &&
    identity.state.providers.includes(selectedProvider)
  const hasKeyForSelected = hasKeyInMemory || needsUnlock
  const hasAnyKey = Object.keys(identity.state.keys).length > 0 || selectedProvider === 'ollama'

  const canStart = !!question.trim() && remainingToday > 0 && !loading && hasKeyForSelected

  // Ref-pattern for a truly stable handleStart reference. If we used a plain
  // useCallback with [question, benchmarkEnabled, ...] deps, the ref would
  // change on every keystroke and defeat the memo on TeamCardGrid, causing
  // the agent spheres to flicker on input. The ref-indirection keeps the
  // exposed callback's identity stable across renders while always calling
  // the latest closure (which sees fresh state).
  const handleStartImplRef = useRef<() => Promise<void>>(() => Promise.resolve())
  handleStartImplRef.current = async () => {
    if (!canStart) return
    setLoading(true)

    // If the selected provider is saved-but-locked, unlock first. This is the
    // one-click flow when the user arrives at /deliberate with a pre-seeded
    // last-used model from localStorage — they shouldn't have to click the
    // picker just to trigger biometric; hitting DELIBERATE does both.
    let freshKeys: Record<string, string> | undefined
    if (needsUnlock) {
      try {
        freshKeys = (await identity.unlockWithPasskey()) as Record<string, string>
      } catch (e) {
        errorToast(
          'Could not unlock',
          e instanceof Error ? e.message : 'Try picking the model from the picker instead.'
        )
        setLoading(false)
        return
      }
    }

    // The apiKey is not sent to /start. The deliberation page passes it to
    // /workflow/run?stream=true when the SSE stream opens. See /trust.
    const body: Record<string, unknown> = {
      question: question.trim(),
      agents: selectedPreset.agents.map((a) => a.role),
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
      const baselineApiKey =
        globalModel.provider === 'ollama'
          ? 'ollama-local'
          : (freshKeys?.[globalModel.provider] ?? globalModel.apiKey) || undefined
      if (baselineApiKey) {
        void fireBaselineBenchmark(session_id, question.trim(), { ...globalModel, apiKey: baselineApiKey })
      }
    }

    router.push(`/autonomous/deliberation/${session_id}`)
  }
  const handleStart = useCallback(() => handleStartImplRef.current(), [])

  return {
    question,
    setQuestion,
    selectedPreset,
    setSelectedPreset,
    globalModel,
    setGlobalModel,
    loading,
    canStart,
    needsUnlock,
    hasAnyKey,
    benchmarkEnabled,
    setBenchmarkEnabled,
    handleStart,
    faceStyle
  }
}
