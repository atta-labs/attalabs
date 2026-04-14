import { auth } from '@atta/auth/hooks'
import { redirect } from 'next/navigation'
import { QuestionInput } from './components/QuestionInput'
import { getDailySessionCount, getOrCreateUser } from '@/db/queries'
import { DAILY_SESSION_LIMIT } from '@/schemas'

export default async function DeliberatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId, '')
  const dailyCount = await getDailySessionCount(user.id)
  const remaining = DAILY_SESSION_LIMIT - dailyCount
  const { error } = await searchParams

  return (
    <main className='flex min-h-[calc(100dvh-3.5rem)] flex-col'>
      <QuestionInput remainingToday={remaining} initialError={error} />
    </main>
  )
}
