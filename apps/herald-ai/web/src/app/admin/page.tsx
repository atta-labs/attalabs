import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AIOnboarding } from '@/components/portal/AIOnboarding'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)

  // No user record yet → show onboarding
  if (!user?.onboardingComplete) {
    return <AIOnboarding />
  }

  // Onboarding complete → go to UI dashboard
  redirect('/admin/ui')
}
