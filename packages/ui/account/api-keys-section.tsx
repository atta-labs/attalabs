'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Input, Badge } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { Plus, Trash2 } from 'lucide-react'
import { CopyButton } from './copy-button'

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

type ApiKeysResponse = { keys: ApiKey[] }
type CreateApiKeyResponse = { key: NewlyCreatedKey }

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

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
      const res = await fetch(`/api/keys/api/${apiKey.id}`, { method: 'DELETE' })
      if (!res.ok) return
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
        <code className='min-w-0 flex-1 truncate font-mono text-xs text-foreground'>{newKey.plaintext}</code>
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

export interface ApiKeysSectionProps {
  productLabel?: string
}

export function ApiKeysSection({ productLabel = 'API' }: ApiKeysSectionProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[] | null>(null)
  const [apiKeysError, setApiKeysError] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revealedKey, setRevealedKey] = useState<NewlyCreatedKey | null>(null)

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
    fetchApiKeys()
  }, [fetchApiKeys])

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

  return (
    <div className='space-y-4'>
      <div className='space-y-1'>
        <Text as='p' className='font-medium'>
          {productLabel} API Keys
        </Text>
        <Text as='p' muted className='text-sm'>
          Bearer tokens for the hosted MCP endpoint. Each key can be revoked independently.
        </Text>
      </div>

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

      {revealedKey && <RevealedKeyBox newKey={revealedKey} onDismiss={() => setRevealedKey(null)} />}

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
  )
}
