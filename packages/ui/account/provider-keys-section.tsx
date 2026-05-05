'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Input, Badge } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { Trash2, Eye, EyeOff } from 'lucide-react'

type Vendor = 'anthropic' | 'google' | 'openai' | 'xai'

type ProviderStatus = Partial<Record<Vendor, true>>

type ProviderStatusResponse = { status: ProviderStatus }

const VENDORS: Array<{ id: Vendor; label: string }> = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'xai', label: 'xAI' }
]

type ProviderKeyRowProps = {
  vendor: Vendor
  label: string
  configured: boolean
  onSaved: () => void
}

function ProviderKeyRow({ vendor, label, configured, onSaved }: ProviderKeyRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showValue, setShowValue] = useState(false)

  const handleSave = async () => {
    if (!value.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/keys/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor, key: value.trim() })
      })
      if (!res.ok) return
      setValue('')
      setEditing(false)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      const res = await fetch(`/api/keys/provider/${vendor}`, { method: 'DELETE' })
      if (!res.ok) return
      onSaved()
    } finally {
      setRemoving(false)
    }
  }

  const handleCancel = () => {
    setValue('')
    setEditing(false)
    setShowValue(false)
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-3'>
        <Text as='span' className='text-sm font-medium'>
          {label}
        </Text>
        <div className='flex-1' />
        {configured ? (
          <Badge variant='outline' className='text-success border-success/40 text-xs'>
            Configured
          </Badge>
        ) : (
          <Badge variant='outline' className='text-muted-foreground border-border text-xs'>
            Not set
          </Badge>
        )}
        <div className='flex items-center gap-1'>
          {configured && !editing && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleRemove}
              disabled={removing}
              className='h-7 w-7 px-0 text-destructive hover:text-destructive'
            >
              <Trash2 className='size-3.5' />
            </Button>
          )}
          {!editing && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setEditing(true)}
              className='h-7 w-16 text-xs'
            >
              {configured ? 'Update' : 'Add'}
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className='flex items-center gap-2'>
          <div className='relative flex-1'>
            <Input
              type={showValue ? 'text' : 'password'}
              placeholder={`Paste your ${label} API key…`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className='pr-9 text-sm font-mono'
            />
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setShowValue((v) => !v)}
              className='absolute inset-y-0 right-1 h-auto px-2 text-muted-foreground hover:text-foreground'
            >
              {showValue ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
            </Button>
          </div>
          <Button
            type='button'
            size='sm'
            onClick={handleSave}
            disabled={saving || !value.trim()}
            className='h-9 text-xs'
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button type='button' variant='ghost' size='sm' onClick={handleCancel} className='h-9 text-xs'>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

export function ProviderKeysSection() {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null)
  const [providerError, setProviderError] = useState(false)

  const fetchProviderStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/keys/provider/status')
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as ProviderStatusResponse
      setProviderStatus(data.status)
      setProviderError(false)
    } catch {
      setProviderError(true)
    }
  }, [])

  useEffect(() => {
    fetchProviderStatus()
  }, [fetchProviderStatus])

  return (
    <div className='space-y-4'>
      <div className='space-y-1'>
        <Text as='p' className='font-medium'>
          Provider API Keys
        </Text>
        <Text as='p' muted className='text-sm'>
          Store your AI provider keys server-side. They are encrypted at rest and used only during deliberations.
        </Text>
      </div>

      {providerError ? (
        <Text as='p' muted className='text-sm'>
          Unable to load provider key status.
        </Text>
      ) : providerStatus === null ? (
        <Text as='p' muted className='text-sm'>
          Loading…
        </Text>
      ) : (
        <div className='divide-y divide-border'>
          {VENDORS.map((v) => (
            <div key={v.id} className='py-3 first:pt-0 last:pb-0'>
              <ProviderKeyRow
                vendor={v.id}
                label={v.label}
                configured={providerStatus[v.id] === true}
                onSaved={fetchProviderStatus}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
