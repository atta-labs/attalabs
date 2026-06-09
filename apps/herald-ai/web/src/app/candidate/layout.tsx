import { cmsClient, getHeraldBranding } from '@atta/cms'
import { TopBar } from '@atta/ui/topbar'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/db/queries'
import { ModeSwitch } from '@/components/ModeSwitch'
import { CandidateShell } from '@/components/portal/CandidateShell'
import { HeraldUserButton } from '@/components/herald-user-button'
import type { UILibrary } from '@atta/ui/lib/library-loader'

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [user, branding] = await Promise.all([getUserByClerkId(userId), getHeraldBranding(cmsClient).catch(() => null)])

  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null
  const userLibrary = (user?.library ?? 'basic') as UILibrary

  // Keep contextual in-portal nav. Dashboard/Settings are in the avatar menu — don't duplicate.
  const signedInLinks = user?.onboardingComplete
    ? [
        { label: 'UI', href: '/candidate/ui' },
        ...(user.username ? [{ label: `/${user.username}`, href: `/${user.username}`, external: true as const }] : [])
      ]
    : []

  return (
    <CandidateShell initialLibrary={userLibrary}>
      <div className='flex h-screen flex-col'>
        <TopBar
          logoText='Herald'
          logoUrl={logoUrl}
          logoTagline={['Forensic hiring', 'audits']}
          signedInLinks={signedInLinks}
          extraActions={<ModeSwitch />}
          accountMenu={<HeraldUserButton />}
        />
        <main className='flex-1 overflow-hidden'>{children}</main>
      </div>
    </CandidateShell>
  )
}
