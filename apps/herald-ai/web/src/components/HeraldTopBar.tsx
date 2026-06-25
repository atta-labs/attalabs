import { cmsClient, getHeraldBranding } from '@atta/cms'
import { Button } from '@atta/ui/components/button'
import { TopBar } from '@atta/ui/topbar'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Settings as SettingsIcon } from 'lucide-react'
import { getUserByClerkId } from '@/db/queries'
import { HeraldAccountMenu } from '@/components/HeraldAccountMenu'

export async function HeraldTopBar() {
  const { userId } = await auth()
  const [branding, user] = await Promise.all([
    getHeraldBranding(cmsClient).catch(() => null),
    userId ? getUserByClerkId(userId) : Promise.resolve(null)
  ])

  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  const signedInLinks =
    userId && user?.onboardingComplete
      ? [
          { label: 'Bulk Audit', href: '/bulk-audit' },
          ...(user.username ? [{ label: `/${user.username}`, href: `/${user.username}`, external: true as const }] : [])
        ]
      : []

  // Gear → /{me}/settings. Rendered as part of `extraActions` (TopBar's right-
  // cluster slot, immediately before the account menu). D-035: rendered with
  // the build-time CMS `Button` import to stay on the app-chrome library even
  // if a user-library provider ever wraps this. aria-label for screen readers.
  const extraActions =
    userId && user?.onboardingComplete && user.username ? (
      <Button asChild variant='outline' size='icon' className='h-8 w-8' aria-label='Settings' title='Settings'>
        <Link href={`/${user.username}/settings`}>
          <SettingsIcon className='h-4 w-4' />
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
