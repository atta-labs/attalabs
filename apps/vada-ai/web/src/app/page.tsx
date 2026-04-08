import { auth } from '@atta/auth/hooks'
import { HomeContent } from '@/components/home/HomeContent'
import { UserTopBar } from '@/components/home/UserTopBar'

export default async function Home() {
  const { userId: clerkId } = await auth()

  return (
    <main className='flex min-h-dvh flex-col items-center justify-center text-center'>
      {clerkId && <UserTopBar />}
      <HomeContent isSignedIn={!!clerkId} />
    </main>
  )
}
