'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToastContext } from '@atta/ui'
import { useUserPreferences } from '@/lib/user-preferences-context'
import { PRESETS, type Preset } from '@/schemas'
import type { FaceStyle } from '@atta/ui/canvas'
import type { ModelSelection } from './GlobalModelSelector'

interface UseDeliberateFormProps {
  remainingToday: number
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
  handleStart: () => Promise<void>
  faceStyle: FaceStyle
}

export function useDeliberateForm({ remainingToday, initialError }: UseDeliberateFormProps): DeliberateFormState {
  const [question, setQuestion] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]!)
  const [globalModel, setGlobalModel] = useState<ModelSelection | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { errorToast } = useToastContext()
  const { faceStyle } = useUserPreferences()

  useEffect(() => {
    if (initialError) errorToast('Could not start deliberation', initialError)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canStart = !!question.trim() && remainingToday > 0 && !loading && !!globalModel?.provider

  const handleStart = async () => {
    if (!canStart) return
    setLoading(true)

    const body: Record<string, unknown> = {
      question: question.trim(),
      agents: selectedPreset.agents.map((a) => a.role),
      ...(globalModel && {
        provider: globalModel.provider,
        modelId: globalModel.modelId,
        ...(globalModel.apiKey ? { apiKey: globalModel.apiKey } : {})
      })
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
    router.push(`/deliberation/${session_id}`)
  }

  return {
    question,
    setQuestion,
    selectedPreset,
    setSelectedPreset,
    globalModel,
    setGlobalModel,
    loading,
    canStart,
    handleStart,
    faceStyle
  }
}
