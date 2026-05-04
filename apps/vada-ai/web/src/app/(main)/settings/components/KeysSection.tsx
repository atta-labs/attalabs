'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Input, Badge, Separator } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { CopyButton } from '@/app/(main)/mcp/components/CopyButton'

// ── Types ────────────────────────────────────────────────────────────────────

type Vendor = 'anthropic' | 'google' | 'openai' | 'xai'

type ProviderStatus = Partial<Record<Vendor, true>>

type ApiKey = {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

type NewlyCreatedKey = {
  id: string
  name: string
  createdAt: string
  plaintext: string
}

type ProviderStatusResponse = { status: ProviderStatus }
type ApiKeysResponse = { keys: ApiKey[] }
type CreateApiKeyResponse = { key: NewlyCreatedKey }

// ── Constants ─────────────────────────────────────────────────────────────────

const VENDORS: Array<{ id: Vendor; label: string }> = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'google', label: 'Google' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'xai', label: 'xAI' }
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// ── Provider Key Row ──────────────────────────────────────────────────────────

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
      await fetch('/api/keys/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor, key: value.trim() })
      })
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
      await fetch(`/api/keys/provider/${vendor}`, { method: 'DELETE' })
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
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <Text as='span' className='text-sm font-medium'>
            {label}
          </Text>
          {configured ? (
            <Badge variant='outline' className='text-success border-success/40 text-xs'>
              Configured
            </Badge>
          ) : (
            <Badge variant='outline' className='text-muted-foreground border-border text-xs'>
              Not set
            </Badge>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {configured && !editing && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleRemove}
              disabled={removing}
              className='h-7 text-xs text-destructive hover:text-destructive'
            >
              <Trash2 className='size-3.5' />
              {removing ? 'Removing…' : 'Remove'}
            </Button>
          )}
          {!editing && (
            <Button type='button' variant='ghost' size='sm' onClick={() => setEditing(true)} className='h-7 text-xs'>
              <Plus className='size-3.5' />
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

// ── API Key Row ───────────────────────────────────────────────────────────────

type ApiKeyRowProps = {
  apiKey: ApiKey
  onRevoked: () => void
}

function ApiKeyRow({ apiKey, onRevoked }: ApiKeyRowProps) {
  const [revoking, setRevoking] = useState(false)
  const isRevoked = apiKey.revokedAt !== null

  const handleRevoke = async () => {
    setRevoking(true)
    try {
      await fetch(`/api/keys/api/${apiKey.id}`, { method: 'DELETE' })
      onRevoked()
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className='flex items-center justify-between gap-3 py-2'>
      <div className='min-w-0 flex-1 space-y-0.5'>
        <div className='flex items-center gap-2'>
          <Text as='span' className='text-sm font-medium'>
            {apiKey.name}
          </Text>
          {isRevoked && (
            <Badge variant='outline' className='text-muted-foreground border-border text-xs'>
              Revoked
            </Badge>
          )}
        </div>
        <Text as='p' muted className='text-xs'>
          Created {formatDate(apiKey.createdAt)} ·{' '}
          {apiKey.lastUsedAt ? `Last used ${formatDate(apiKey.lastUsedAt)}` : 'Never used'}
        </Text>
      </div>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={handleRevoke}
        disabled={isRevoked || revoking}
        className='h-7 shrink-0 text-xs text-destructive hover:text-destructive disabled:text-muted-foreground'
      >
        <Trash2 className='size-3.5' />
        {revoking ? 'Revoking…' : 'Revoke'}
      </Button>
    </div>
  )
}

// ── Revealed Key Box ──────────────────────────────────────────────────────────

type RevealedKeyBoxProps = {
  newKey: NewlyCreatedKey
  onDismiss: () => void
}

function RevealedKeyBox({ newKey, onDismiss }: RevealedKeyBoxProps) {
  return (
    <div className='space-y-2 rounded-lg border border-border bg-muted/30 p-3'>
      <div className='flex items-start justify-between gap-2'>
        <Text as='p' className='text-sm font-medium'>
          {newKey.name}
        </Text>
        <Badge variant='outline' className='text-success border-success/40 shrink-0 text-xs'>
          New
        </Badge>
      </div>
      <div className='flex items-center gap-2 rounded border border-border bg-background px-3 py-2'>
        <code className='flex-1 break-all font-mono text-xs text-foreground'>{newKey.plaintext}</code>
        <CopyButton text={newKey.plaintext} />
      </div>
      <Text as='p' muted className='text-xs'>
        Store this key securely. It won't be shown again.
      </Text>
      <Button type='button' variant='ghost' size='sm' onClick={onDismiss} className='h-7 text-xs'>
        Dismiss
      </Button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function KeysSection() {
  // Provider keys state
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null)
  const [providerError, setProviderError] = useState(false)

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[] | null>(null)
  const [apiKeysError, setApiKeysError] = useState(false)

  // Create new API key form
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revealedKey, setRevealedKey] = useState<NewlyCreatedKey | null>(null)

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

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/keys/api')
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as ApiKeysResponse
      setApiKeys(data.keys)
      setApiKeysError(false)
    } catch {
      setApiKeysError(true)
    }
  }, [])

  useEffect(() => {
    fetchProviderStatus()
    fetchApiKeys()
  }, [fetchProviderStatus, fetchApiKeys])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/keys/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() })
      })
      if (!res.ok) return
      const data = (await res.json()) as CreateApiKeyResponse
      setRevealedKey(data.key)
      setNewKeyName('')
      await fetchApiKeys()
    } finally {
      setCreating(false)
    }
  }

  const handleDismissReveal = () => {
    setRevealedKey(null)
  }

  return (
    <>
      <Separator className='opacity-20' />

      {/* Provider API Keys */}
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

      <Separator className='opacity-20' />

      {/* Vāda API Keys */}
      <div className='space-y-4'>
        <div className='space-y-1'>
          <Text as='p' className='font-medium'>
            Vāda API Keys
          </Text>
          <Text as='p' muted className='text-sm'>
            Bearer tokens for the hosted MCP endpoint. Each key can be revoked independently.
          </Text>
        </div>

        {/* Create new key form */}
        <div className='flex items-center gap-2'>
          <Input
            type='text'
            placeholder='Key name (e.g. "Claude Desktop")'
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateKey()
            }}
            className='text-sm'
          />
          <Button
            type='button'
            size='sm'
            onClick={handleCreateKey}
            disabled={creating || !newKeyName.trim()}
            className='h-9 shrink-0 text-xs'
          >
            <Plus className='size-3.5' />
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </div>

        {/* Revealed key one-time box */}
        {revealedKey && <RevealedKeyBox newKey={revealedKey} onDismiss={handleDismissReveal} />}

        {/* Key list */}
        {apiKeysError ? (
          <Text as='p' muted className='text-sm'>
            Unable to load API keys.
          </Text>
        ) : apiKeys === null ? (
          <Text as='p' muted className='text-sm'>
            Loading…
          </Text>
        ) : apiKeys.length === 0 ? (
          <Text as='p' muted className='text-sm'>
            No API keys created yet.
          </Text>
        ) : (
          <div className='divide-y divide-border'>
            {apiKeys.map((key) => (
              <ApiKeyRow key={key.id} apiKey={key} onRevoked={fetchApiKeys} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
