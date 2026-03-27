import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { TopBar } from '@/components/shared/TopBar'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (!user?.onboardingComplete) redirect('/')

  return (
    <>
      <TopBar username={user.username} />
      {children}
    </>
  )
}
