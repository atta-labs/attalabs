'use client'

import { useIdentity } from '@atta/identity/react'
import { Button, useToastContext } from '@atta/ui'
import { CloudUpload } from 'lucide-react'
import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'vada:migration-prompt-dismissed'

interface MigrationPromptProps {
  configuredProviders: string[]
}

export function MigrationPrompt({ configuredProviders }: MigrationPromptProps) {
  const identity = useIdentity()
  const { successToast, errorToast } = useToastContext()
  const [dismissed, setDismissed] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasDismissed = localStorage.getItem(DISMISSED_KEY) === '1'
      if (!wasDismissed) setDismissed(false)
    }
  }, [])

  const kind = identity.state.kind
  const hasLocalKeys = kind === 'locked' || kind === 'unlocked'
  const hasServerKeys = configuredProviders.length > 0

  if (dismissed || done || !hasLocalKeys || hasServerKeys) {
    return null
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  const migrate = async () => {
    setMigrating(true)
    try {
      let keys: Record<string, string>
      if (kind === 'locked') {
        const unlocked = await identity.unlockWithPasskey()
        keys = unlocked as Record<string, string>
      } else {
        keys = identity.state.keys as Record<string, string>
      }
      for (const [vendor, key] of Object.entries(keys)) {
        if (!key) continue
        await fetch('/api/keys/provider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor, key })
        })
      }
      localStorage.setItem(DISMISSED_KEY, '1')
      setDone(true)
      successToast('Keys migrated', 'Your API keys are now saved to your account.')
    } catch (e) {
      errorToast(
        'Migration failed',
        e instanceof Error ? e.message : 'Could not migrate keys. You can add them again in Settings.'
      )
    } finally {
      setMigrating(false)
    }
  }

  const providerCount =
    kind === 'locked'
      ? identity.state.providers.length
      : Object.entries(identity.state.keys).filter(([, v]) => Boolean(v)).length

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-4 py-3'>
      <div className='flex items-center gap-2.5'>
        <CloudUpload className='size-4 shrink-0 text-muted-foreground' aria-hidden />
        <p className='text-sm text-muted-foreground'>
          {providerCount === 1
            ? 'You have an API key stored locally. Save it to your account?'
            : `You have ${providerCount} API keys stored locally. Save them to your account?`}
        </p>
      </div>
      <div className='flex items-center gap-2'>
        <Button type='button' size='sm' variant='outline' onClick={migrate} disabled={migrating}>
          {migrating ? 'Migrating…' : 'Save to account'}
        </Button>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          onClick={dismiss}
          disabled={migrating}
          className='text-muted-foreground'
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
