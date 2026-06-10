import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AIOnboarding } from '@/components/portal/AIOnboarding'
import { getUserByClerkId } from '@/db/queries'

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (user?.onboardingComplete) redirect('/bulk-audit')

  return <AIOnboarding />
}
