import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getProductConfig } from '@atta/cms'
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

  // Owner /ui + /settings render the BUILD-TIME library — never the visitor's
  // profile library. Mirrors app/(app)/layout.tsx, and the route-group split
  // means no parent provider can cross the two paths; nothing stops this
  // layout being edited to cross them deliberately. The invariant, why that
  // crossing is the most expensive bug this area has produced, and what does
  // and does not hold it are in
  // apps/herald-ai/specs/herald-app-architecture.md § 4.
  const config = await getProductConfig('herald').catch(() => null)
  const chromeLibrary = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  return (
    <CandidateShell initialLibrary={chromeLibrary}>
      <div className='flex h-screen flex-col'>
        <HeraldTopBar context='owner' />
        <main className='flex-1 overflow-hidden'>{children}</main>
      </div>
    </CandidateShell>
  )
}
