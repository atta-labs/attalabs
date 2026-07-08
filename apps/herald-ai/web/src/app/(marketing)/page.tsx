import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/portal/LandingPage'
import { getUserByClerkId } from '@/db/queries'

// A signed-in user landing on the marketing homepage (e.g. Clerk's post-auth
// redirect, a stale bookmark, or navigating back) must not see the signed-out
// marketing pitch with an authenticated topbar on top of it — route them to
// wherever their own account state actually points, same as every other
// (app)-group page's guard (bulk-audit/page.tsx, onboarding/page.tsx).
export default async function HomePage() {
  const { userId } = await auth()
  if (userId) {
    const user = await getUserByClerkId(userId)
    redirect(user?.onboardingComplete ? '/bulk-audit' : '/onboarding')
  }

  return <LandingPage />
}
