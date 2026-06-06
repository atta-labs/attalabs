import { cmsClient, getHeraldBranding } from '@atta/cms'
import { TopBar } from '@atta/ui/topbar'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/db/queries'
import { ModeSwitch } from '@/components/ModeSwitch'

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [user, branding] = await Promise.all([getUserByClerkId(userId), getHeraldBranding(cmsClient).catch(() => null)])

  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  const signedInLinks = user?.onboardingComplete
    ? [
        { label: 'User Interface', href: '/candidate/ui' },
        { label: 'Settings', href: '/candidate/settings' },
        ...(user.username ? [{ label: `/${user.username}`, href: `/${user.username}`, external: true as const }] : [])
      ]
    : []

  return (
    <div className='flex h-screen flex-col'>
      <TopBar
        logoText='Herald'
        logoUrl={logoUrl}
        logoTagline={['Forensic hiring', 'audits']}
        signedInLinks={signedInLinks}
      />
      <ModeSwitch />
      <main className='flex-1 overflow-hidden'>{children}</main>
    </div>
  )
}
