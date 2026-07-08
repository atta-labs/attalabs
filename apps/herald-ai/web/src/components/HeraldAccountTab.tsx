'use client'

import { useState } from 'react'
import { useUser } from '@atta/auth'
import { AttaUserProfile } from '@atta/ui/account'
import { Button, Sheet, SheetClose, SheetContent, SheetTrigger } from '@atta/ui/components'
import { Settings as SettingsIcon, X } from 'lucide-react'

/**
 * Herald-local Account tab.
 *
 * Embedding Clerk's `<UserProfile/>` directly in the narrow settings column
 * looks cramped at every breakpoint. Instead we show a small identity summary
 * in the column, and open the full Clerk surface in a full-screen Sheet when
 * the user clicks "Manage account".
 *
 * Kept Herald-local so Vāda's existing embedded `AttaUserProfile` usage is
 * unchanged — `@atta/ui/account` is not modified.
 */
export function HeraldAccountTab() {
  const { user, isLoaded } = useUser()
  const [open, setOpen] = useState(false)

  const labelClass = 'mb-1 block font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'

  return (
    <div className='space-y-8'>
      <section>
        <h2 className='mb-4 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Identity</h2>
        <div className='space-y-3 rounded-md border border-border bg-card p-4'>
          <div>
            <span className={labelClass}>Name</span>
            <p className='font-sans text-sm text-foreground'>{isLoaded ? (user?.fullName ?? '—') : 'Loading…'}</p>
          </div>
          <div>
            <span className={labelClass}>Email</span>
            <p className='font-mono text-xs text-muted-foreground'>
              {isLoaded ? (user?.primaryEmailAddress?.emailAddress ?? '—') : 'Loading…'}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className='mb-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>Manage</h2>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button type='button' variant='outline' className='gap-2 font-mono text-xs uppercase tracking-[0.2em]'>
                <SettingsIcon className='h-3.5 w-3.5' />
                Manage account
              </Button>
            }
          />
          <SheetContent
            side='top'
            showCloseButton={false}
            className='flex flex-col bg-background p-0 data-[side=top]:h-dvh'
          >
            <div className='flex h-14 shrink-0 items-center justify-between border-b border-border px-6'>
              <span className='font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>
                Manage account
              </span>
              <SheetClose render={<Button variant='outline' size='icon' aria-label='Close' />}>
                <X className='h-4 w-4' />
                <span className='sr-only'>Close</span>
              </SheetClose>
            </div>
            <div className='flex-1 overflow-auto px-4 py-6 sm:px-6'>
              <div className='mx-auto w-full max-w-[960px]'>
                <AttaUserProfile />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <p className='mt-2 font-mono text-xs text-muted-foreground'>
          Opens the full account surface — profile, security, connected accounts.
        </p>
      </section>
    </div>
  )
}
