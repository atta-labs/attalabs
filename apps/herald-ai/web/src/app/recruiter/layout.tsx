import { cmsClient, getHeraldBranding } from '@atta/cms'
import { TopBar } from '@atta/ui/topbar'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ModeSwitch } from '@/components/ModeSwitch'

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const branding = await getHeraldBranding(cmsClient).catch(() => null)
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null

  return (
    <div className='flex h-screen flex-col'>
      <TopBar logoText='Herald' logoUrl={logoUrl} logoTagline={['Forensic hiring', 'audits']} signedInLinks={[]} />
      <ModeSwitch />
      <main className='flex-1 overflow-hidden'>{children}</main>
    </div>
  )
}
