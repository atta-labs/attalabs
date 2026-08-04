import { getProductBranding } from '@atta/cms'
import { Button } from '@atta/ui/components'
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
 *  - `'owner'` — `/[username]/(owner)/ui` + `/settings`. Shows /username only;
 *    Bulk Audit is excluded so the owner's appearance/settings space isn't doubled up
 *    with the audit nav. The Settings gear in `extraActions` still routes to
 *    `/{username}/settings`, so navigation between the two owner surfaces is preserved.
 */
export async function HeraldTopBar({ context = 'main' }: { context?: 'main' | 'owner' } = {}) {
  const { userId } = await auth()
  const [branding, user] = await Promise.all([
    getProductBranding('herald').catch(() => null),
    userId ? getUserByClerkId(userId) : Promise.resolve(null)
  ])

  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  // Signed-in users must not click through the marketing homepage — it
  // immediately redirects them right back (see (marketing)/page.tsx), which
  // tore down and remounted whatever page they were on (most visibly
  // AIOnboarding) for a jarring flash of the wrong layout. Send them straight
  // to where '/' would have sent them anyway.
  const logoHref = userId ? (user?.onboardingComplete ? '/bulk-audit' : '/onboarding') : '/'

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
  // `Button` comes from the FLAT `@atta/ui/components` import, which
  // herald's next.config.ts aliases (webpack + turbopack) to
  // `packages/ui/generated/herald/components.ts` — written by
  // generateUIIndex('herald') from the CMS chrome library (retro). So chrome
  // renders the build-time CMS library. NOT the `@atta/ui/components/button`
  // subpath, which bypasses the alias and always resolves to basic.
  const extraActions =
    userId && user?.onboardingComplete && user.username ? (
      <Button asChild variant='outline' aria-label='Settings' className='h-8 gap-2 px-2.5 text-xs md:px-3'>
        <Link href={`/${user.username}/settings`}>
          <SettingsIcon className='h-4 w-4' />
          <span>Settings</span>
        </Link>
      </Button>
    ) : undefined

  return (
    <TopBar
      logoText='Herald'
      logoUrl={logoUrl}
      logoHref={logoHref}
      logoTagline={['Forensic hiring', 'audits']}
      isSignedIn={!!userId}
      signedInLinks={signedInLinks}
      extraActions={extraActions}
      accountMenu={<HeraldAccountMenu />}
    />
  )
}
