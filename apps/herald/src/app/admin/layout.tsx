import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { TopBar } from '@/components/shared/TopBar'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)

  return (
    <div className='flex h-screen flex-col'>
      <div className='sticky top-0 z-10'>
        <TopBar username={user?.username} />
      </div>
      <div className='flex-1 overflow-y-auto'>{children}</div>
    </div>
  )
}
