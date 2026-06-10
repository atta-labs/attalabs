'use client'

import { Button as BasicButton } from '@atta/ui/components/button'
import { useComponents } from '@atta/ui/lib/library-provider'
import { useClerk, useUser } from '@atta/auth'
import { LogOut } from 'lucide-react'

/**
 * Herald signed-in control: a single themed "Sign out" button.
 *
 * Deliberately NOT an avatar and NOT a dropdown:
 * - The Clerk account (identity, email, connected Google account) lives in
 *   Settings → Account tab (AttaUserProfile) — that is the one place for identity.
 * - The user's own profile avatar lives on their public page (/[username]).
 * A third, topbar avatar would be redundant with both, and a hardcoded
 * rounded avatar fights the per-library theme (e.g. retro/brutal want sharp
 * corners). A library Button stays theme-consistent everywhere.
 *
 * Named export kept as `HeraldAccountMenu` so existing layout imports are
 * unchanged; it simply renders a button now.
 */
export function HeraldAccountMenu() {
  const { signOut } = useClerk()
  const { user } = useUser()
  const comps = useComponents()
  const Button = (comps.Button as typeof BasicButton | undefined) ?? BasicButton

  if (!user) return null

  return (
    <Button
      variant='outline'
      aria-label='Sign out'
      title='Sign out'
      className='h-8 gap-2 px-2.5 text-xs md:px-3'
      onClick={() => signOut({ redirectUrl: '/' })}
    >
      <LogOut className='h-4 w-4' />
      <span className='hidden md:inline'>Sign out</span>
    </Button>
  )
}
