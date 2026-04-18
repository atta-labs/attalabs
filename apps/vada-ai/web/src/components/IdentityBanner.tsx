'use client'

// Renders the BYOK affordance for every identity state:
//   - no keys / no credential: "Pick a model above…" teaser with /trust link
//   - no credential + in-memory keys: "Save with passkey"
//   - locked: "Unlock with passkey"
//   - unlocked: "Sign out / Forget this device"
// Single source of truth for the top-of-deliberate-page banner.

import { providerLabel } from '@atta/identity'
import { useIdentity } from '@atta/identity/react'
import { Button, Text, useToastContext } from '@atta/ui'
import { KeyRound, ShieldX, Unlock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export function IdentityBanner() {
  const identity = useIdentity()
  const { errorToast, successToast } = useToastContext()
  const [busy, setBusy] = useState(false)
  const [confirmForget, setConfirmForget] = useState(false)

  const hasInMemoryKeys = Object.keys(identity.state.keys).length > 0

  const handleSave = async () => {
    if (!hasInMemoryKeys) {
      errorToast('No keys to save', 'Add at least one API key first.')
      return
    }
    setBusy(true)
    try {
      await identity.savePasskey()
      successToast('Keys saved', 'Unlock with Touch ID / Face ID / Windows Hello next time.')
    } catch (e) {
      errorToast(
        'Could not save with passkey',
        e instanceof Error ? e.message : 'Your keys stay in memory for this session.'
      )
    } finally {
      setBusy(false)
    }
  }

  const handleForget = async () => {
    setBusy(true)
    try {
      await identity.forgetDevice()
      successToast('This device is forgotten', 'Your passkey in your OS keychain was not touched.')
    } catch (e) {
      errorToast('Could not forget device', e instanceof Error ? e.message : 'Try again.')
    } finally {
      setBusy(false)
      setConfirmForget(false)
    }
  }

  // Silent until mount-time IndexedDB check resolves — otherwise the
  // first-time banner flashes for ~1 frame before flipping to 'locked' for
  // returning users. Locked is also silent; unlock is triggered on model pick.
  if (identity.state.kind === 'initializing') return null
  if (identity.state.kind === 'locked') return null

  // No stored credential AND no in-memory keys: first-time BYOK hint
  if (identity.state.kind === 'no-stored-credential' && !hasInMemoryKeys) {
    return (
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <KeyRound className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          <Text as='small' className='text-sm text-muted-foreground'>
            Pick a model above to add your first API key.{' '}
            <Link href='/trust' className='underline'>
              Your keys stay in your browser.
            </Link>
          </Text>
        </div>
      </div>
    )
  }

  // No stored credential: optionally prompt to save if user has in-memory keys
  if (identity.state.kind === 'no-stored-credential' && hasInMemoryKeys && identity.passkeySupported) {
    return (
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <KeyRound className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          <Text as='small' className='text-sm text-muted-foreground'>
            Save your keys securely with a passkey? You'll unlock with Touch ID / Face ID / Windows Hello next visit.
          </Text>
        </div>
        <Button type='button' size='sm' variant='outline' onClick={handleSave} disabled={busy}>
          Save with passkey
        </Button>
      </div>
    )
  }

  // Unlocked: offer sign out + forget device
  if (identity.state.kind === 'unlocked') {
    if (confirmForget) {
      return (
        <div className='space-y-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3'>
          <div className='flex items-start gap-2.5'>
            <ShieldX className='mt-0.5 size-4 shrink-0 text-destructive' aria-hidden />
            <Text as='small' className='text-sm text-foreground'>
              Your stored API keys on this device will be permanently deleted. You will need to re-enter them to use
              Vāda here again. Your passkey in your OS keychain will not be deleted automatically — remove it there
              separately if you want to.
            </Text>
          </div>
          <div className='flex gap-2 pl-6'>
            <Button type='button' size='sm' variant='destructive' onClick={handleForget} disabled={busy}>
              Forget this device
            </Button>
            <Button type='button' size='sm' variant='outline' onClick={() => setConfirmForget(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )
    }
    return (
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <Unlock className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          <Text as='small' className='text-sm text-muted-foreground'>
            {identity.state.providers.length > 0
              ? `Unlocked — ${identity.state.providers.map(providerLabel).join(', ')} configured on this device.`
              : Object.keys(identity.state.keys).length > 0
                ? `Unlocked — ${(Object.keys(identity.state.keys) as typeof identity.state.providers).map(providerLabel).join(', ')} in memory for this session.`
                : 'Unlocked — no keys yet.'}
          </Text>
        </div>
        <div className='flex items-center gap-2'>
          <Button type='button' size='sm' variant='ghost' onClick={() => identity.signOut()} disabled={busy}>
            Sign out
          </Button>
          <Button type='button' size='sm' variant='outline' onClick={() => setConfirmForget(true)} disabled={busy}>
            Forget this device
          </Button>
        </div>
      </div>
    )
  }

  // Otherwise (no credential, no keys, or passkey unsupported): nothing to offer.
  return null
}
