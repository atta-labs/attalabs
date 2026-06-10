import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { cmsClient, getHeraldConfig } from '@atta/cms'
import { CandidateShell } from '@/components/portal/CandidateShell'
import { HeraldTopBar } from '@/components/HeraldTopBar'
import type { UILibrary } from '@atta/ui/lib/library-loader'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // App chrome (topbar, settings, /ui editor) must render the BUILD-TIME library
  // — the one packages/ui/generated/herald/components.ts is generated from.
  // Source of truth: heraldConfig.userInterface.library.id (same value generate-ui.ts reads).
  // user.library is intentionally ignored here; it only drives the public /[username] profile.
  const config = await getHeraldConfig(cmsClient).catch(() => null)
  const chromeLibrary = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  return (
    <CandidateShell initialLibrary={chromeLibrary}>
      <div className='flex h-screen flex-col'>
        <HeraldTopBar />
        <main className='flex-1 overflow-hidden'>{children}</main>
      </div>
    </CandidateShell>
  )
}
