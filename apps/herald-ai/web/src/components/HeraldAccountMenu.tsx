'use client'

import { Button as DefaultButton } from '@atta/ui/components'
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
 * Button policy (ui-retro-contract-v1 f/u 3): the default Button resolves
 * BUILD-TIME to the CMS chrome library (retro) via the FLAT `@atta/ui/components`
 * import — herald's next.config.ts aliases it to
 * `packages/ui/generated/herald/components.ts` (generateUIIndex). (The
 * `@atta/ui/components/button` SUBPATH used before f/u 3 bypassed that alias and
 * always resolved to basic — the cause of basic buttons on retro chrome.)
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
