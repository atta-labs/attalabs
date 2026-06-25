import { cmsClient, getHeraldBranding } from '@atta/cms'
import { Button } from '@atta/ui/components/button'
import { TopBar } from '@atta/ui/topbar'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Settings as SettingsIcon } from 'lucide-react'
import { getUserByClerkId } from '@/db/queries'
import { HeraldAccountMenu } from '@/components/HeraldAccountMenu'

/**
 * Shared Herald topbar. The optional `context` prop tunes the centered nav
 * to the surface that rendered the layout:
 *  - `'main'`  (default) — `/bulk-audit`, `/onboarding`. Shows Bulk Audit + /username.
 *  - `'owner'` — `/[username]/(owner)/ui` + `/settings` (D-060). Shows /username only;
 *    Bulk Audit is excluded so the owner's appearance/settings space isn't doubled up
 *    with the audit nav. The Settings gear in `extraActions` still routes to
 *    `/{username}/settings`, so navigation between the two owner surfaces is preserved.
 */
export async function HeraldTopBar({ context = 'main' }: { context?: 'main' | 'owner' } = {}) {
  const { userId } = await auth()
  const [branding, user] = await Promise.all([
    getHeraldBranding(cmsClient).catch(() => null),
    userId ? getUserByClerkId(userId) : Promise.resolve(null)
  ])

  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  const profileLink =
    userId && user?.onboardingComplete && user.username
      ? [{ label: `/${user.username}`, href: `/${user.username}`, external: true as const }]
      : []
  const signedInLinks =
    userId && user?.onboardingComplete
      ? context === 'owner'
        ? profileLink
        : [{ label: 'Bulk Audit', href: '/bulk-audit' }, ...profileLink]
      : []

  // Gear → /{me}/settings, rendered in TopBar's right-cluster `extraActions`
  // slot (immediately before `accountMenu`). Matches `HeraldAccountMenu`'s
  // responsive icon-with-label pattern: icon-only ≤ md, icon + "Settings" ≥ md.
  // D-035: imported from the build-time `Button` so the app-chrome library
  // resolves correctly inside the (owner) tree.
  const extraActions =
    userId && user?.onboardingComplete && user.username ? (
      <Button
        asChild
        variant='outline'
        aria-label='Settings'
        title='Settings'
        className='h-8 gap-2 px-2.5 text-xs md:px-3'
      >
        <Link href={`/${user.username}/settings`}>
          <SettingsIcon className='h-4 w-4' />
          <span className='hidden md:inline'>Settings</span>
        </Link>
      </Button>
    ) : undefined

  return (
    <TopBar
      logoText='Herald'
      logoUrl={logoUrl}
      logoTagline={['Forensic hiring', 'audits']}
      isSignedIn={!!userId}
      signedInLinks={signedInLinks}
      extraActions={extraActions}
      accountMenu={<HeraldAccountMenu />}
    />
  )
}
