import { cmsClient, getHeraldBranding } from '@atta/cms'
import { TopBar } from '@atta/ui/topbar'
import { auth } from '@clerk/nextjs/server'
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
          { label: 'UI', href: '/ui' },
          { label: 'Settings', href: '/settings' },
          ...(user.username ? [{ label: `/${user.username}`, href: `/${user.username}`, external: true as const }] : [])
        ]
      : []

  return (
    <TopBar
      logoText='Herald'
      logoUrl={logoUrl}
      logoTagline={['Forensic hiring', 'audits']}
      isSignedIn={!!userId}
      signedInLinks={signedInLinks}
      accountMenu={<HeraldAccountMenu />}
    />
  )
}
