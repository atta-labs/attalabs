import { cmsClient, getHeraldBranding } from '@atta/cms'
import { TopBar } from '@atta/ui/topbar'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [user, branding] = await Promise.all([getUserByClerkId(userId), getHeraldBranding(cmsClient).catch(() => null)])

  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  const signedInLinks = user?.onboardingComplete
    ? [
        { label: 'User Interface', href: '/admin/ui' },
        { label: 'Settings', href: '/admin/settings' },
        ...(user.username ? [{ label: `/${user.username}`, href: `/${user.username}`, external: true as const }] : [])
      ]
    : []

  return (
    <div className='flex h-screen flex-col'>
      <TopBar logoText='Herald' logoUrl={logoUrl} signedInLinks={signedInLinks} />
      <main className='flex-1 overflow-hidden'>{children}</main>
    </div>
  )
}
