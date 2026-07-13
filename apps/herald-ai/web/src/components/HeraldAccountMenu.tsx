'use client'

import { Button as DefaultButton } from '@atta/ui/components/button'
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
 * Button policy (ui-retro-contract-v1 f/u 2): resolved BUILD-TIME via the
 * static `@atta/ui/components/button` import on every chrome surface (topbar).
 * The one exception is the candidate's public-profile tree (envoy-shell under
 * `[username]/(profile)`), which must render the candidate's runtime-chosen
 * library — that call site injects its `useComponents()`-resolved Button via
 * the `ButtonComponent` prop. Chrome callers pass nothing and get build-time.
 *
 * Named export kept as `HeraldAccountMenu` so existing layout imports are
 * unchanged; it simply renders a button now.
 */
export function HeraldAccountMenu({ ButtonComponent = DefaultButton }: { ButtonComponent?: typeof DefaultButton }) {
  const { signOut } = useClerk()
  const { user } = useUser()

  if (!user) return null

  const Button = ButtonComponent

  return (
    <Button
      variant='outline'
      aria-label='Sign out'
      title='Sign out'
      className='h-8 gap-2 px-2.5 text-xs md:px-3'
      onClick={() => signOut({ redirectUrl: '/' })}
    >
      <LogOut className='h-4 w-4' />
      <span>Sign out</span>
    </Button>
  )
}
