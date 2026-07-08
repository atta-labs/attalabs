import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/portal/LandingPage'
import { getUserByClerkId } from '@/db/queries'

// Same guard as (marketing)/page.tsx — this route renders the identical
// signed-out marketing pitch and must not show it to an authenticated user.
export default async function HomePublicPage() {
  const { userId } = await auth()
  if (userId) {
    const user = await getUserByClerkId(userId)
    redirect(user?.onboardingComplete ? '/bulk-audit' : '/onboarding')
  }

  return <LandingPage />
}
