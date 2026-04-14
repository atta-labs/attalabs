import { auth } from '@atta/auth/hooks'
import { redirect } from 'next/navigation'
import { Heading, Text } from '@atta/ui/shared'
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
    <main className='flex min-h-dvh flex-col items-center justify-center px-4 py-16'>
      <div className='mb-10 w-full max-w-xl space-y-2 text-center'>
        <Heading level={1} className='font-serif text-4xl font-light tracking-wide'>
          Vāda Deliberations
        </Heading>
        <Text as='p' muted className='font-mono text-xs uppercase tracking-widest'>
          Cold Start
        </Text>
      </div>

      <QuestionInput remainingToday={remaining} initialError={error} />
    </main>
  )
}
