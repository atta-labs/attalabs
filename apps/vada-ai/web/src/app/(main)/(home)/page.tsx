import { auth } from '@atta/auth/hooks'
import { HomeContent } from './components/HomeContent'

export default async function Home() {
  const { userId: clerkId } = await auth()

  return (
    <main>
      <HomeContent isSignedIn={!!clerkId} />
    </main>
  )
}
