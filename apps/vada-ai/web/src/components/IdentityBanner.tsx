'use client'

// Presentational only. All state + behavior lives in useIdentityBanner.
// Conditional on identity state:
//   - initializing: silent (null)
//   - locked: unified panel with status + sign out + forget + optional update button
//   - no-stored-credential + no keys: first-time hint + /trust link
//   - no-stored-credential + in-memory keys + passkey supported: save prompt
//   - unlocked: unified panel with status + sign out + forget + optional update button

import { providerLabel } from '@atta/identity'
import { Button, Text } from '@atta/ui'
import { KeyRound, Lock, ShieldX, Unlock, X } from 'lucide-react'
import Link from 'next/link'
import { useIdentityBanner } from './useIdentityBanner'

function ProviderChip({
  provider,
  onRemove,
  disabled
}: {
  provider: string
  onRemove: (provider: string) => void
  disabled: boolean
}) {
  return (
    <span className='inline-flex items-center gap-1.5'>
      {provider}
      <Button
        type='button'
        size='icon'
        variant='outline'
        onClick={() => onRemove(provider)}
        disabled={disabled}
        className='size-6 text-muted-foreground hover:bg-transparent hover:text-destructive'
        aria-label={`Remove ${provider} key`}
      >
        <X className='size-4' aria-hidden />
      </Button>
    </span>
  )
}

export function IdentityBanner() {
  const b = useIdentityBanner()

  // Initializing: stay silent until the mount-time IndexedDB check resolves.
  if (b.kind === 'initializing') return null

  // Locked: unified panel with status, update button (if unsaved), sign out, forget device
  if (b.kind === 'locked') {
    if (b.pendingRemoveProvider) {
      return (
        <div className='space-y-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3'>
          <div className='flex items-start gap-2.5'>
            <ShieldX className='mt-0.5 size-4 shrink-0 text-destructive' aria-hidden />
            <Text as='small' className='text-sm text-foreground'>
              Remove {providerLabel(b.pendingRemoveProvider as (typeof b.unsavedProviders)[0])} key? You'll need to
              re-enter it to use {providerLabel(b.pendingRemoveProvider as (typeof b.unsavedProviders)[0])} models
              again.
            </Text>
          </div>
          <div className='flex gap-2 pl-6'>
            <Button type='button' size='sm' variant='destructive' onClick={b.confirmRemoveProvider} disabled={b.busy}>
              Remove
            </Button>
            <Button type='button' size='sm' variant='outline' onClick={b.cancelRemoveProvider} disabled={b.busy}>
              Cancel
            </Button>
          </div>
        </div>
      )
    }
    if (b.confirmForget) {
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
            <Button type='button' size='sm' variant='destructive' onClick={b.forget} disabled={b.busy}>
              Forget this device
            </Button>
            <Button type='button' size='sm' variant='outline' onClick={b.cancelForget} disabled={b.busy}>
              Cancel
            </Button>
          </div>
        </div>
      )
    }
    return (
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-4 py-3'>
        <div className='flex flex-wrap items-center gap-2.5'>
          <Lock className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          <Text as='small' className='text-sm text-muted-foreground'>
            {b.savedProviders.map((provider, i) => (
              <span key={provider}>
                {i > 0 && ' - '}
                <ProviderChip
                  provider={providerLabel(provider)}
                  onRemove={() => b.promptRemoveProvider(provider)}
                  disabled={b.busy}
                />
              </span>
            ))}
          </Text>
        </div>
        <div className='flex items-center gap-2'>
          {b.unsavedProviders.length > 0 && (
            <Button type='button' size='sm' variant='outline' onClick={b.updatePasskey} disabled={b.busy}>
              {b.unsavedProviders.length === 1
                ? `Save ${b.unsavedProviders.map(providerLabel)[0]} with passkey`
                : `Save ${b.unsavedProviders.length} new keys with passkey`}
            </Button>
          )}
          <Button
            type='button'
            size='sm'
            variant='ghost'
            onClick={b.signOut}
            disabled={b.busy}
            className='text-destructive hover:text-destructive'
          >
            Sign out
          </Button>
          <Button type='button' size='sm' variant='outline' onClick={b.promptForget} disabled={b.busy}>
            Forget this device
          </Button>
        </div>
      </div>
    )
  }

  if (b.kind === 'no-stored-credential' && !b.hasInMemoryKeys) {
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

  if (b.kind === 'no-stored-credential' && b.hasInMemoryKeys && b.passkeySupported) {
    return (
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <KeyRound className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          <Text as='small' className='text-sm text-muted-foreground'>
            Save your keys securely with a passkey? You'll unlock with Touch ID / Face ID / Windows Hello next visit.
          </Text>
        </div>
        <Button type='button' size='sm' variant='outline' onClick={b.save} disabled={b.busy}>
          Save with passkey
        </Button>
      </div>
    )
  }

  if (b.kind === 'unlocked') {
    if (b.pendingRemoveProvider) {
      return (
        <div className='space-y-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3'>
          <div className='flex items-start gap-2.5'>
            <ShieldX className='mt-0.5 size-4 shrink-0 text-destructive' aria-hidden />
            <Text as='small' className='text-sm text-foreground'>
              Remove {providerLabel(b.pendingRemoveProvider as (typeof b.unsavedProviders)[0])} key? You'll need to
              re-enter it to use {providerLabel(b.pendingRemoveProvider as (typeof b.unsavedProviders)[0])} models
              again.
            </Text>
          </div>
          <div className='flex gap-2 pl-6'>
            <Button type='button' size='sm' variant='destructive' onClick={b.confirmRemoveProvider} disabled={b.busy}>
              Remove
            </Button>
            <Button type='button' size='sm' variant='outline' onClick={b.cancelRemoveProvider} disabled={b.busy}>
              Cancel
            </Button>
          </div>
        </div>
      )
    }
    if (b.confirmForget) {
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
            <Button type='button' size='sm' variant='destructive' onClick={b.forget} disabled={b.busy}>
              Forget this device
            </Button>
            <Button type='button' size='sm' variant='outline' onClick={b.cancelForget} disabled={b.busy}>
              Cancel
            </Button>
          </div>
        </div>
      )
    }
    return (
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-4 py-3'>
        <div className='flex flex-wrap items-center gap-2.5'>
          <Unlock className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          <Text as='small' className='text-sm text-muted-foreground'>
            Unlocked —{' '}
            {b.allProviders.map((provider, i) => (
              <span key={provider}>
                {i > 0 && ', '}
                <ProviderChip
                  provider={providerLabel(provider)}
                  onRemove={() => b.promptRemoveProvider(provider)}
                  disabled={b.busy}
                />
              </span>
            ))}
          </Text>
        </div>
        <div className='flex items-center gap-2'>
          {b.unsavedProviders.length > 0 && (
            <Button type='button' size='sm' variant='outline' onClick={b.updatePasskey} disabled={b.busy}>
              {b.unsavedProviders.length === 1
                ? `Save ${b.unsavedProviders.map(providerLabel)[0]} with passkey`
                : `Save ${b.unsavedProviders.length} new keys with passkey`}
            </Button>
          )}
          <Button
            type='button'
            size='sm'
            variant='ghost'
            onClick={b.signOut}
            disabled={b.busy}
            className='text-destructive hover:text-destructive'
          >
            Sign out
          </Button>
          <Button type='button' size='sm' variant='outline' onClick={b.promptForget} disabled={b.busy}>
            Forget this device
          </Button>
        </div>
      </div>
    )
  }

  return null
}
