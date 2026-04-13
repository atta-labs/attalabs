import { auth } from '@atta/auth/hooks'
import { redirect } from 'next/navigation'
import { Heading, Text } from '@atta/ui'
import { QuestionInput } from './components/QuestionInput'
import { getDailySessionCount, getOrCreateUser } from '@/db/queries'
import { DAILY_SESSION_LIMIT } from '@/schemas'
import { StickyHeaderTopBar } from '@/components/StickyHeaderTopBar'
import Link from 'next/link'

export default async function DeliberatePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId, '')
  const dailyCount = await getDailySessionCount(user.id)
  const remaining = DAILY_SESSION_LIMIT - dailyCount
  const { error } = await searchParams

  return (
    <main className='flex min-h-dvh flex-col'>
      <StickyHeaderTopBar className='justify-center text-muted-foreground'>
        <Heading level={1} className='font-serif text-xl font-normal tracking-wide'>
          What do you want to figure out?
        </Heading>
      </StickyHeaderTopBar>

      <div className='flex flex-1 flex-col items-center justify-center gap-10 px-4 py-12 text-center'>
        <QuestionInput remainingToday={remaining} initialError={error} />

        <Link href='/history' className='text-sm text-primary underline-offset-4 hover:underline'>
          Past deliberations
        </Link>

        <Text as='small' className='text-[10px] uppercase tracking-[0.3em] '>
          an atta.ai product
        </Text>
      </div>
    </main>
  )
}
