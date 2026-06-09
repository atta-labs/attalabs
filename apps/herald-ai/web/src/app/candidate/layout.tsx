import { cmsClient, getHeraldBranding } from '@atta/cms'
import { TopBar } from '@atta/ui/topbar'
import { Button } from '@atta/ui'
import { NextLink } from '@atta/ui/lib/next-link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Settings } from 'lucide-react'
import { getUserByClerkId } from '@/db/queries'
import { CandidateShell } from '@/components/portal/CandidateShell'
import type { UILibrary } from '@atta/ui/lib/library-loader'

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [user, branding] = await Promise.all([getUserByClerkId(userId), getHeraldBranding(cmsClient).catch(() => null)])

  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null
  const userLibrary = (user?.library ?? 'basic') as UILibrary

  const signedInLinks = user?.onboardingComplete
    ? [
        { label: 'Audit', href: '/candidate/audit' },
        { label: 'UI', href: '/candidate/ui' },
        ...(user.username ? [{ label: `/${user.username}`, href: `/${user.username}`, external: true as const }] : [])
      ]
    : []

  const extraActions = (
    <Button variant='ghost' size='icon' asChild aria-label='Settings' title='Settings'>
      <NextLink variant='unstyled' href='/candidate/settings'>
        <Settings className='h-4 w-4' />
      </NextLink>
    </Button>
  )

  return (
    <CandidateShell initialLibrary={userLibrary}>
      <div className='flex h-screen flex-col'>
        <TopBar
          logoText='Herald'
          logoUrl={logoUrl}
          logoTagline={['Forensic hiring', 'audits']}
          signedInLinks={signedInLinks}
          extraActions={extraActions}
        />
        <main className='flex-1 overflow-hidden'>{children}</main>
      </div>
    </CandidateShell>
  )
}
