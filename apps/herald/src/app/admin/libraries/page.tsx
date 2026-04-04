import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { LibraryPicker } from '@/components/portal/LibraryPicker'
import { getUserByClerkId } from '@/db/queries'

export default async function LibrariesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await getUserByClerkId(userId)
  if (!user?.onboardingComplete) redirect('/admin')

  return (
    <div className='mx-auto max-w-[700px] px-6 py-8'>
      <header className='mb-8'>
        <h1 className='font-display text-xl tracking-tight'>Component Libraries</h1>
        <p className='mt-1 font-mono text-xs text-muted-foreground'>Choose a visual style for your Envoy page.</p>
      </header>

      <LibraryPicker currentLibrary={user.library ?? 'basic'} />
    </div>
  )
}
