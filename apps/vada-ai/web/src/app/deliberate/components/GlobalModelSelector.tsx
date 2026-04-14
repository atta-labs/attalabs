'use client'

import { useEffect, useState } from 'react'
import { Button, Input } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { getStoredApiKey, storeApiKey } from '@/lib/model-keys'
import type { Provider } from '@/lib/models'

export interface ModelOption {
  provider: Provider
  modelId: string
  label: string
  keyPrefix: string
}

export const MODEL_OPTIONS: ModelOption[] = [
  { provider: 'groq', modelId: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B — Groq', keyPrefix: 'gsk_' },
  { provider: 'google', modelId: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Google', keyPrefix: 'AIza' },
  { provider: 'anthropic', modelId: 'claude-sonnet-4-5', label: 'Claude Sonnet — Anthropic', keyPrefix: 'sk-ant-' },
  {
    provider: 'openrouter',
    modelId: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'Llama 3.3 70B — OpenRouter',
    keyPrefix: 'sk-or-'
  }
]

export interface ModelSelection {
  provider: Provider
  modelId: string
  apiKey: string
}

export type PerAgentModelMap = Record<string, ModelSelection>

interface GlobalModelSelectorProps {
  value: ModelSelection | null
  onChange: (v: ModelSelection | null) => void
  perAgentMode: boolean
  onTogglePerAgent: () => void
}

export function GlobalModelSelector({ value, onChange, perAgentMode, onTogglePerAgent }: GlobalModelSelectorProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})

  useEffect(() => {
    const stored: Record<string, string> = {}
    for (const m of MODEL_OPTIONS) {
      const key = getStoredApiKey(m.provider)
      if (key) stored[m.provider] = key
    }
    setApiKeys(stored)
    if (!value && stored.groq) {
      const groq = MODEL_OPTIONS[0]!
      onChange({ provider: groq.provider, modelId: groq.modelId, apiKey: stored.groq })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const opt = MODEL_OPTIONS.find((m) => m.provider === e.target.value)
    if (!opt) return
    const apiKey = getStoredApiKey(opt.provider)
    onChange({ provider: opt.provider, modelId: opt.modelId, apiKey })
  }

  const handleKeyChange = (provider: Provider, key: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: key }))
    storeApiKey(provider, key)
    if (value?.provider === provider) onChange({ ...value, apiKey: key })
  }

  const selectedOption = MODEL_OPTIONS.find((m) => m.provider === value?.provider)
  const needsKey = value && !getStoredApiKey(value.provider)

  if (perAgentMode) {
    return (
      <div className='flex items-center justify-end'>
        <Button variant='ghost' size='sm' onClick={onTogglePerAgent} className='text-xs underline'>
          Use global model
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
        Intelligence
      </Text>
      <select
        value={value?.provider ?? ''}
        onChange={handleSelect}
        className='w-full rounded-lg border border-border/50 bg-card/60 px-3 py-2 font-sans text-sm text-foreground outline-none focus:border-muted-foreground'
      >
        <option value='' disabled>
          Select a model…
        </option>
        {MODEL_OPTIONS.map((m) => (
          <option key={m.provider} value={m.provider}>
            {m.label}
          </option>
        ))}
      </select>

      {needsKey && selectedOption && (
        <div className='rounded-lg border border-border/30 bg-background/60 p-3'>
          <Text as='p' size='xs' muted className='mb-2'>
            Enter your {selectedOption.label.split('—')[1]?.trim()} API key
          </Text>
          <Input
            type='password'
            autoComplete='off'
            placeholder={`${selectedOption.keyPrefix}…`}
            value={apiKeys[selectedOption.provider] ?? ''}
            onChange={(e) => handleKeyChange(selectedOption.provider, e.target.value)}
            className='font-mono text-xs'
          />
        </div>
      )}

      <div className='flex justify-end'>
        <Button variant='ghost' size='sm' onClick={onTogglePerAgent} className='text-xs underline'>
          Configure per-agent
        </Button>
      </div>
    </div>
  )
}
