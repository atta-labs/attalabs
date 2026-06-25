import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { cmsClient, getHeraldConfig } from '@atta/cms'
import { CandidateShell } from '@/components/portal/CandidateShell'
import { HeraldTopBar } from '@/components/HeraldTopBar'
import { getUserByClerkId } from '@/db/queries'
import type { UILibrary } from '@atta/ui/lib/library-loader'

export default async function OwnerLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ username: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  // Funnel non-onboarded users into /onboarding before the owner gate runs —
  // an in-progress user typically has no username yet, which would otherwise
  // 404 here instead of routing them to finish setup.
  if (!user?.onboardingComplete) redirect('/onboarding')

  const { username: segment } = await params
  // Owner gate: the signed-in user's username must match the [username] segment.
  // Anonymous already redirected above; non-owner falls through to 404 so the
  // public profile at /[username] remains reachable but its owner-only sub-
  // routes do not leak the existence of someone else's editor.
  if (user.username !== segment) notFound()

  // D-035 (Lock: YES): owner /ui + /settings render the BUILD-TIME library —
  // never the visitor's profile library. Mirrors app/(app)/layout.tsx so
  // crossing the two paths stays impossible-by-construction.
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
