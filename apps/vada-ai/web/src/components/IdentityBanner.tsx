'use client'

// Presentational only. All state + behavior lives in useIdentityBanner.
// Conditional on identity state:
//   - initializing / locked: silent (null)
//   - no-stored-credential + no keys: first-time hint + /trust link
//   - no-stored-credential + in-memory keys + passkey supported: save prompt
//   - unlocked: sign out + forget device (confirm dialog on forget)

import { Button, Text } from '@atta/ui'
import { KeyRound, ShieldX, Unlock } from 'lucide-react'
import Link from 'next/link'
import { useIdentityBanner } from './useIdentityBanner'

export function IdentityBanner() {
  const b = useIdentityBanner()

  if (b.kind === 'initializing' || b.kind === 'locked') return null

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
        <div className='flex items-center gap-2.5'>
          <Unlock className='size-4 shrink-0 text-muted-foreground' aria-hidden />
          <Text as='small' className='text-sm text-muted-foreground'>
            Unlocked — {b.providerSummary}
          </Text>
        </div>
        <div className='flex items-center gap-2'>
          <Button type='button' size='sm' variant='ghost' onClick={b.signOut} disabled={b.busy}>
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
