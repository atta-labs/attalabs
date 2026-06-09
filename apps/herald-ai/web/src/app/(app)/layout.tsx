import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserByClerkId } from '@/db/queries'
import { CandidateShell } from '@/components/portal/CandidateShell'
import { HeraldTopBar } from '@/components/HeraldTopBar'
import type { UILibrary } from '@atta/ui/lib/library-loader'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  const userLibrary = (user?.library ?? 'basic') as UILibrary

  return (
    <CandidateShell initialLibrary={userLibrary}>
      <div className='flex h-screen flex-col'>
        <HeraldTopBar />
        <main className='flex-1 overflow-hidden'>{children}</main>
      </div>
    </CandidateShell>
  )
}
