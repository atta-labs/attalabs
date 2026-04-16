import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AdminTopBar } from '@/components/portal/AdminTopBar'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)

  // If no user yet (pre-onboarding), render children without topbar
  if (!user?.onboardingComplete) {
    return <main className='h-screen'>{children}</main>
  }

  return (
    <div className='flex h-screen flex-col'>
      <AdminTopBar username={user.username} />
      <main className='flex-1 overflow-hidden'>{children}</main>
    </div>
  )
}
