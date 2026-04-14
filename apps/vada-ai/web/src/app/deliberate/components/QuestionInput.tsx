'use client'

import { Button, Textarea } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PRESETS, type Preset, type PresetId } from '@/schemas'
import { PresetSelector } from './PresetSelector'
import { RosterReveal } from './RosterReveal'
import { GlobalModelSelector, type ModelSelection, type PerAgentModelMap } from './GlobalModelSelector'
import { X } from 'lucide-react'

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
    <div className='w-full max-w-xl space-y-4'>
      {error && (
        <div className='flex items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3'>
          <Text as='p' size='sm' className='text-destructive'>
            {error}
          </Text>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setError(null)}
            className='mt-0.5 h-auto shrink-0 p-0 text-destructive/60 hover:opacity-70'
          >
            <X className='h-3.5 w-3.5' />
          </Button>
        </div>
      )}

      <div className='rounded-2xl border border-border/20 bg-card/30 p-6 backdrop-blur-sm'>
        <div className='space-y-5'>
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
            className='min-h-[140px] resize-none border-border/40 bg-background/40 font-sans placeholder:text-muted-foreground/50 focus:border-muted-foreground'
          />

          <div className='flex items-center justify-between'>
            <Text as='span' size='xs' muted className='font-mono'>
              {remainingToday} session{remainingToday !== 1 ? 's' : ''} remaining today
            </Text>
            <Button onClick={handleStart} disabled={!canStart} className='font-mono text-xs tracking-wide'>
              {startLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
