'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input
} from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { getStoredApiKey, storeApiKey } from '@/lib/model-keys'
import type { Provider } from '@/lib/models'
import { cn } from '@atta/ui/lib/utils'

export interface ModelOption {
  provider: Provider
  modelId: string
  label: string
  keyPrefix: string
}

export const MODEL_OPTIONS: ModelOption[] = [
  { provider: 'groq', modelId: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B — Groq', keyPrefix: 'gsk_' },
  { provider: 'google', modelId: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Google', keyPrefix: 'AIza' },
  { provider: 'anthropic', modelId: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — Anthropic', keyPrefix: 'sk-ant-' },
  {
    provider: 'openrouter',
    modelId: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'Llama 3.3 70B — OpenRouter (Free)',
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
  settingsProviders?: string[]
  initialTeamModels?: Array<{ teamId: string; agentRole: string; provider: string; modelId: string }>
  selectedPresetId?: string
}

export function GlobalModelSelector({
  value,
  onChange,
  settingsProviders = [],
  initialTeamModels = [],
  selectedPresetId
}: GlobalModelSelectorProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // On mount: seed from settings for the initial preset
    if (selectedPresetId && initialTeamModels.length > 0) {
      const entry = initialTeamModels.find((m) => m.teamId === selectedPresetId)
      if (entry) {
        onChange({
          provider: entry.provider as Provider,
          modelId: entry.modelId,
          apiKey: getStoredApiKey(entry.provider) ?? ''
        })
        return
      }
    }
    // Fall back to localStorage (existing behavior)
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

  // When preset changes, re-seed from settings for the new preset
  useEffect(() => {
    if (!selectedPresetId || !initialTeamModels.length) return
    const entry = initialTeamModels.find((m) => m.teamId === selectedPresetId)
    if (!entry) return
    onChange({
      provider: entry.provider as Provider,
      modelId: entry.modelId,
      apiKey: getStoredApiKey(entry.provider) ?? ''
    })
  }, [selectedPresetId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (opt: ModelOption) => {
    const apiKey = getStoredApiKey(opt.provider) ?? ''
    onChange({ provider: opt.provider, modelId: opt.modelId, apiKey })
    if (apiKey || settingsProviders.includes(opt.provider)) setOpen(false)
  }

  const handleKeyChange = (provider: Provider, key: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: key }))
    storeApiKey(provider, key)
    if (value?.provider === provider) onChange({ ...value, apiKey: key })
  }

  const selectedOption = MODEL_OPTIONS.find((m) => m.provider === value?.provider)
  const displayName = selectedOption
    ? (selectedOption.label.split('—')[0]?.trim().toUpperCase() ?? 'SELECT MODEL')
    : 'SELECT MODEL'
  const needsKey = value && !getStoredApiKey(value.provider) && !settingsProviders.includes(value.provider)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='h-auto gap-1.5 p-0 text-foreground/70 hover:bg-transparent hover:text-foreground'
        >
          <Text as='span' className='font-mono text-[10px] uppercase tracking-widest'>
            {displayName}
          </Text>
          <ChevronsUpDown className='h-3 w-3' />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='start' side='top' className='w-72 border-border/40 bg-card/95 backdrop-blur-md'>
        <DropdownMenuLabel className='font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60'>
          Intelligence
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODEL_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.provider}
            onClick={() => handleSelect(opt)}
            className={cn('flex items-center justify-between py-3', value?.provider === opt.provider && 'bg-muted/30')}
          >
            <div className='flex flex-col gap-0.5'>
              <Text as='span' className='font-mono text-[10px] uppercase tracking-widest text-foreground'>
                {opt.label.split('—')[0]?.trim()}
              </Text>
              <Text as='span' className='font-sans text-[11px] text-muted-foreground'>
                {opt.label.split('—')[1]?.trim()}
              </Text>
            </div>
            {value?.provider === opt.provider && <Check className='h-3.5 w-3.5 shrink-0 text-foreground' />}
          </DropdownMenuItem>
        ))}

        {needsKey && selectedOption && (
          <>
            <DropdownMenuSeparator />
            <div className='px-2 py-2'>
              <Text
                as='p'
                size='xs'
                className='mb-1.5 font-mono text-[9px] uppercase tracking-widest text-foreground/60'
              >
                API Key Required
              </Text>
              <Input
                type='password'
                autoComplete='off'
                placeholder={`${selectedOption.keyPrefix}…`}
                value={apiKeys[selectedOption.provider] ?? ''}
                onChange={(e) => handleKeyChange(selectedOption.provider, e.target.value)}
                className='font-mono text-xs'
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
