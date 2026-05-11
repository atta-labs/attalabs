'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Input, Badge } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { Trash2, Eye, EyeOff } from 'lucide-react'
import { ProviderIcon } from '@lobehub/icons'
import { VENDORS, VENDOR_ORDER, type VendorId } from '@atta/models'

// Vendor list derived from @atta/models so settings, the picker, and the status
// endpoint all see the same set. Ollama is excluded — it's a local-runtime
// toggle, not a vendor key, and is managed via its own probe.
type NonOllamaVendor = Exclude<VendorId, 'ollama'>

type ProviderStatus = Partial<Record<NonOllamaVendor, true>>

type ProviderStatusResponse = { status: ProviderStatus }

const VENDOR_LIST: Array<{ id: NonOllamaVendor; label: string }> = VENDOR_ORDER.filter(
  (id): id is NonOllamaVendor => id !== 'ollama'
).map((id) => ({ id, label: VENDORS[id].label }))

type ProviderKeyRowProps = {
  vendor: NonOllamaVendor
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
        <ProviderIcon provider={vendor} size={20} type='avatar' />
        <Text as='span' className='text-sm font-medium'>
          {label}
        </Text>
        <div className='flex-1' />
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
          <>
            {configured ? (
              <Badge variant='outline' className='text-success border-success/40 text-xs'>
                Configured
              </Badge>
            ) : (
              <Badge variant='outline' className='text-muted-foreground border-border text-xs'>
                Not set
              </Badge>
            )}
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setEditing(true)}
              className='h-7 w-16 text-xs'
            >
              {configured ? 'Update' : 'Add'}
            </Button>
          </>
        )}
      </div>

      {editing && (
        <div className='flex items-center gap-2'>
          <div className='flex-1'>
            <Input
              type={showValue ? 'text' : 'password'}
              placeholder={`Paste your ${label} API key…`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className='text-sm font-mono'
              rightSection={
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowValue((v) => !v)}
                  className='h-auto shrink-0 px-1 text-muted-foreground hover:text-foreground'
                >
                  {showValue ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
                </Button>
              }
            />
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
          {VENDOR_LIST.map((v) => (
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
