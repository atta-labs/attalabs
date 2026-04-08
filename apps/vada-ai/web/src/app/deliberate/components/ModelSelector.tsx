'use client'

import { useEffect, useState } from 'react'
import { getStoredApiKey, storeApiKey } from '@/lib/model-keys'
import type { Provider } from '@/lib/models'

// ── Model catalog ─────────────────────────────────────────────────────────────

// Provider brand colors live here as the single source of truth.
// They are set as --provider-color CSS variables on each option element
// so all rendering uses var(--provider-color) rather than inline hex.

interface ModelOption {
  provider: Provider
  modelId: string
  label: string
  sublabel: string
  speed: string
  tier: 'free' | 'paid'
  brandColor: string
  keyPrefix: string
}

const FREE_MODELS: ModelOption[] = [
  {
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B',
    sublabel: 'Groq',
    speed: '⚡ Instant',
    tier: 'free',
    brandColor: '#F97316',
    keyPrefix: 'gsk_'
  },
  {
    provider: 'google',
    modelId: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    sublabel: 'Google',
    speed: '🔥 Fast',
    tier: 'free',
    brandColor: '#60A5FA',
    keyPrefix: 'AIza'
  }
]

const PREMIUM_MODELS: ModelOption[] = [
  {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-5',
    label: 'Claude Sonnet',
    sublabel: 'Anthropic',
    speed: '— Standard',
    tier: 'paid',
    brandColor: '#C8A84B',
    keyPrefix: 'sk-ant-'
  },
  {
    provider: 'openrouter',
    modelId: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'Llama 3.3 70B',
    sublabel: 'OpenRouter',
    speed: '⚡ Instant',
    tier: 'free',
    brandColor: '#A78BFA',
    keyPrefix: 'sk-or-'
  }
]

const ALL_MODELS = [...FREE_MODELS, ...PREMIUM_MODELS]

// ── Exported types ────────────────────────────────────────────────────────────

export interface SelectedModel {
  provider: Provider
  modelId: string
  apiKey: string
  brandColor: string
}

interface ModelSelectorProps {
  value: SelectedModel | null
  onChange: (model: SelectedModel) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [tab, setTab] = useState<'free' | 'premium'>('free')
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({})
  const [rememberKey, setRememberKey] = useState(true)

  const currentModels = tab === 'free' ? FREE_MODELS : PREMIUM_MODELS

  // Load stored keys and auto-select Groq if key present
  useEffect(() => {
    const inputs: Record<string, string> = {}
    for (const m of ALL_MODELS) {
      const stored = getStoredApiKey(m.provider)
      if (stored) inputs[m.provider] = stored
    }
    setKeyInputs(inputs)
    if (!value && inputs.groq) {
      const groq = FREE_MODELS[0]!
      onChange({
        provider: 'groq',
        modelId: 'llama-3.3-70b-versatile',
        apiKey: inputs.groq,
        brandColor: groq.brandColor
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (option: ModelOption) => {
    const apiKey = keyInputs[option.provider] ?? ''
    if (rememberKey && apiKey) storeApiKey(option.provider, apiKey)
    onChange({ provider: option.provider, modelId: option.modelId, apiKey, brandColor: option.brandColor })
  }

  const handleKeyChange = (provider: Provider, key: string) => {
    setKeyInputs((prev) => ({ ...prev, [provider]: key }))
    if (value?.provider === provider) {
      onChange({ ...value, apiKey: key })
    }
    if (rememberKey && key) storeApiKey(provider, key)
  }

  const needsKeyInput = (option: ModelOption): boolean => {
    return value?.provider === option.provider && !(keyInputs[option.provider] ?? '')
  }

  return (
    <div className='w-full rounded-xl border border-border bg-card p-4'>
      {/* Label */}
      <p className='mb-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60'>Model</p>

      {/* Tabs */}
      <div className='mb-4 flex gap-1 rounded-lg bg-background p-1'>
        <button
          type='button'
          onClick={() => setTab('free')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'free' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Free &amp; Fast
        </button>
        <button
          type='button'
          onClick={() => setTab('premium')}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'premium' ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Premium
        </button>
      </div>

      {/* Model options */}
      <div className='space-y-2'>
        {currentModels.map((option) => {
          const selected = value?.provider === option.provider
          const showKeyInput = needsKeyInput(option)

          return (
            // --provider-color scopes the brand color to this option block
            <div key={option.provider} style={{ '--provider-color': option.brandColor } as React.CSSProperties}>
              <button
                type='button'
                onClick={() => handleSelect(option)}
                className='w-full rounded-lg border border-border p-3 text-left transition-all hover:border-muted-foreground/40'
                style={
                  selected
                    ? {
                        borderLeftWidth: 3,
                        borderLeftColor: 'var(--provider-color)',
                        borderColor: 'color-mix(in srgb, var(--provider-color) 25%, transparent)'
                      }
                    : {}
                }
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <span
                      className='h-2 w-2 shrink-0 rounded-full'
                      style={{ backgroundColor: 'var(--provider-color)' }}
                    />
                    <div>
                      <span className='text-sm font-medium text-foreground'>{option.label}</span>
                      <span className='ml-1.5 text-xs text-muted-foreground'>{option.sublabel}</span>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-[10px] text-muted-foreground'>{option.speed}</span>
                    <span
                      className='rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider'
                      style={
                        option.tier === 'free'
                          ? {
                              backgroundColor: 'color-mix(in srgb, var(--success) 15%, transparent)',
                              color: 'var(--success)'
                            }
                          : {
                              backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                              color: 'var(--accent)'
                            }
                      }
                    >
                      {option.tier}
                    </span>
                  </div>
                </div>
              </button>

              {/* Inline API key input */}
              {showKeyInput && (
                <div className='mt-1.5 rounded-lg border border-border bg-background p-3'>
                  <p className='mb-2 text-[11px] text-muted-foreground'>Enter your {option.sublabel} API key</p>
                  <input
                    type='password'
                    autoComplete='off'
                    placeholder={`${option.keyPrefix}…`}
                    value={keyInputs[option.provider] ?? ''}
                    onChange={(e) => handleKeyChange(option.provider, e.target.value)}
                    className='w-full rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-muted-foreground/60'
                  />
                  <div className='mt-2 flex items-center justify-between'>
                    <label className='flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground'>
                      <input
                        type='checkbox'
                        checked={rememberKey}
                        onChange={(e) => setRememberKey(e.target.checked)}
                        className='h-3 w-3'
                      />
                      Remember in this browser
                    </label>
                    <span className='text-[9px] text-muted-foreground/50'>Never stored on our servers</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
