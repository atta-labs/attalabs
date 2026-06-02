import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AdminTopBar } from '@/components/portal/AdminTopBar'
import { getUserByClerkId } from '@/db/queries'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)

  // Pre-onboarding: show a minimal brand topbar so the user can exit
  if (!user?.onboardingComplete) {
    return (
      <div className='flex h-screen flex-col'>
        <nav className='flex h-12 shrink-0 items-center border-b border-border bg-background px-4'>
          <a href='/' className='flex items-center gap-2'>
            <span className='text-base'>🎺</span>
            <span className='font-display text-sm font-bold tracking-tight'>Herald</span>
          </a>
        </nav>
        <main className='flex-1 overflow-hidden'>{children}</main>
      </div>
    )
  }

  return (
    <div className='flex h-screen flex-col'>
      <AdminTopBar username={user.username} />
      <main className='flex-1 overflow-hidden'>{children}</main>
    </div>
  )
}
