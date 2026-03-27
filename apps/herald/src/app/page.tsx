import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { LandingPage } from '@/components/portal/LandingPage'
import { OnboardingForm } from '@/components/portal/OnboardingForm'
import { TopBar } from '@/components/shared/TopBar'
import { getUserByClerkId } from '@/db/queries'

export default async function HomePage() {
  const { userId } = await auth()

  // State 1: Not logged in → landing page
  if (!userId) {
    return (
      <>
        <TopBar />
        <LandingPage />
      </>
    )
  }

  // Logged in — check onboarding status
  const user = await getUserByClerkId(userId)

  // State 3: Logged in + onboarding complete → redirect to admin
  if (user?.onboardingComplete) {
    redirect('/admin')
  }

  // State 2: Logged in + no onboarding → show onboarding form
  return (
    <>
      <TopBar />
      <OnboardingForm />
    </>
  )
}
