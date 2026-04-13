'use client'

import { Button, Text, Textarea } from '@atta/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PRESETS, type Preset, type PresetId } from '@/schemas'
import { PresetSelector } from './PresetSelector'
import { RosterReveal } from './RosterReveal'
import { GlobalModelSelector, type ModelSelection, type PerAgentModelMap } from './GlobalModelSelector'

export function QuestionInput({ remainingToday, initialError }: { remainingToday: number; initialError?: string }) {
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]!)
  const [question, setQuestion] = useState('')
  const [globalModel, setGlobalModel] = useState<ModelSelection | null>(null)
  const [perAgentMode, setPerAgentMode] = useState(false)
  const [perAgentValues, setPerAgentValues] = useState<PerAgentModelMap>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError ?? null)
  const router = useRouter()

  const handlePresetChange = (preset: Preset) => {
    setSelectedPreset(preset)
    setPerAgentValues({})
  }

  const handlePerAgentChange = (role: string, v: ModelSelection) => {
    setPerAgentValues((prev) => ({ ...prev, [role]: v }))
  }

  const isPerAgentComplete = selectedPreset.agents.every((a) => perAgentValues[a.role]?.apiKey)

  const canStart =
    !!question.trim() && remainingToday > 0 && !loading && (perAgentMode ? isPerAgentComplete : !!globalModel?.provider)

  const handleStart = async () => {
    if (!canStart) return
    setLoading(true)
    setError(null)

    const agentRoles = selectedPreset.agents.map((a) => a.role)
    let body: Record<string, unknown> = { question: question.trim(), agents: agentRoles }

    if (perAgentMode) {
      const apiKeys: Record<string, string> = {}
      const agentModels: Record<string, { provider: string; modelId: string }> = {}
      for (const [role, cfg] of Object.entries(perAgentValues)) {
        agentModels[role] = { provider: cfg.provider, modelId: cfg.modelId }
        if (cfg.apiKey) apiKeys[cfg.provider] = cfg.apiKey
      }
      body = { ...body, agentModels, apiKeys }
    } else if (globalModel) {
      body = {
        ...body,
        provider: globalModel.provider,
        modelId: globalModel.modelId,
        ...(globalModel.apiKey ? { apiKey: globalModel.apiKey } : {})
      }
    }

    const res = await fetch('/api/deliberation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to start deliberation')
      setLoading(false)
      return
    }

    const { session_id } = await res.json()
    router.push(`/deliberation/${session_id}`)
  }

  const startLabel = loading ? 'Starting…' : `Enter ${selectedPreset.name}`

  return (
    <div className='flex w-full max-w-2xl flex-col gap-6'>
      {error && (
        <div className='flex items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3'>
          <p className='text-sm text-destructive'>{error}</p>
          <button
            type='button'
            onClick={() => setError(null)}
            className='mt-0.5 shrink-0 text-destructive/60 hover:opacity-70'
          >
            ✕
          </button>
        </div>
      )}

      <PresetSelector selected={selectedPreset.id as PresetId} onChange={handlePresetChange} />

      <RosterReveal
        agents={selectedPreset.agents}
        perAgentMode={perAgentMode}
        perAgentValues={perAgentValues}
        onPerAgentChange={handlePerAgentChange}
      />

      <GlobalModelSelector
        value={globalModel}
        onChange={setGlobalModel}
        perAgentMode={perAgentMode}
        onTogglePerAgent={() => {
          setPerAgentMode((m) => !m)
          setPerAgentValues({})
        }}
      />

      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder='What do you want to figure out?'
        className='min-h-[120px] resize-none'
      />

      <div className='flex items-center justify-between'>
        <Text as='span' size='xs' muted>
          {remainingToday} deliberation{remainingToday !== 1 ? 's' : ''} remaining today
        </Text>
        <Button onClick={handleStart} disabled={!canStart}>
          {startLabel}
        </Button>
      </div>
    </div>
  )
}
