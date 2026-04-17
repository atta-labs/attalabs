'use client'

import { Button, Input } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { Check, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import type { ProviderMeta } from '@atta/models'

type Status = 'idle' | 'saving' | 'saved' | 'error'

interface ApiKeyRowProps {
  provider: ProviderMeta
  keyHint: string | null
  onSaved: (provider: string, keyHint: string) => void
  onRemoved: (provider: string) => void
}

export function ApiKeyRow({ provider, keyHint, onSaved, onRemoved }: ApiKeyRowProps) {
  const [inputValue, setInputValue] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const hasKey = keyHint !== null && keyHint !== ''

  const save = async (value: string) => {
    if (!value.trim()) return
    setStatus('saving')
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id, apiKey: value.trim() })
      })
      if (!res.ok) throw new Error()
      const { keyHint: hint } = await res.json()
      onSaved(provider.id, hint)
      setInputValue('')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const remove = async () => {
    setStatus('saving')
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id })
      })
      if (!res.ok) throw new Error()
      onRemoved(provider.id)
      setStatus('idle')
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div className='flex items-center gap-4 py-3 border-b border-border/10 last:border-0'>
      <div className='w-32 shrink-0'>
        <Text as='p' className='font-mono text-[11px] uppercase tracking-widest text-foreground/70'>
          {provider.label}
        </Text>
      </div>

      <div className='flex-1'>
        {hasKey ? (
          <div className='flex items-center gap-2'>
            <Text as='span' className='font-mono text-xs text-muted-foreground'>
              {keyHint}
            </Text>
            <Check className='h-3 w-3 text-foreground/40' />
          </div>
        ) : (
          <Input
            type='password'
            autoComplete='off'
            placeholder={provider.keyPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => save(inputValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save(inputValue)
            }}
            className='font-mono text-xs h-8 max-w-xs'
          />
        )}
      </div>

      <div className='flex items-center gap-2 shrink-0'>
        {status === 'saving' && <Loader2 className='h-3.5 w-3.5 animate-spin text-muted-foreground' />}
        {status === 'saved' && (
          <Text as='span' className='font-mono text-[10px] text-foreground/50'>
            Saved
          </Text>
        )}
        {status === 'error' && (
          <Text as='span' className='font-mono text-[10px] text-destructive'>
            Error
          </Text>
        )}
        {hasKey && status === 'idle' && (
          <Button
            variant='ghost'
            size='sm'
            onClick={remove}
            className='h-auto p-0 text-muted-foreground/40 hover:text-destructive'
          >
            <X className='h-3.5 w-3.5' />
          </Button>
        )}
      </div>
    </div>
  )
}
