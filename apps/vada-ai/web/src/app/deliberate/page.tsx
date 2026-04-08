import { auth } from '@atta/auth/hooks'
import { redirect } from 'next/navigation'
import { Heading, Text } from '@atta/ui'
import { QuestionInput } from './components/QuestionInput'
import { getDailySessionCount, getOrCreateUser } from '@/db/queries'
import { DAILY_SESSION_LIMIT } from '@/schemas'
import Link from 'next/link'

export default async function DeliberatePage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId, '')
  const dailyCount = await getDailySessionCount(user.id)
  const remaining = DAILY_SESSION_LIMIT - dailyCount

  return (
    <main className='flex min-h-dvh flex-col items-center justify-center text-center'>
      <div className='flex flex-col items-center gap-10'>
        <Text as='small' className='text-[11px] uppercase tracking-[0.35em] text-muted-foreground/60'>
          vada.ai
        </Text>

        <div className='flex flex-col items-center gap-2'>
          <Heading level={1} className='font-serif text-7xl font-normal tracking-wide'>
            Vāda
          </Heading>
          <Text as='p' className='font-serif text-lg italic text-muted-foreground'>
            What do you want to figure out?
          </Text>
        </div>

        <QuestionInput remainingToday={remaining} />

        <Link href='/history' className='text-sm text-primary underline-offset-4 hover:underline'>
          Past deliberations
        </Link>

        <Text as='small' className='text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60'>
          an atta.ai product
        </Text>
      </div>
    </main>
  )
}
