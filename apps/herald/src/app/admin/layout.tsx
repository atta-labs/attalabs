import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { AdminSidebar } from '@/components/portal/AdminSidebar'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)

  // If no user yet (pre-onboarding), render children without sidebar
  if (!user?.onboardingComplete) {
    return <div className='h-screen'>{children}</div>
  }

  return (
    <div className='flex h-screen'>
      <AdminSidebar username={user.username} />
      <div className='flex-1 overflow-hidden'>{children}</div>
    </div>
  )
}
