import { auth } from '@atta/auth/hooks'
import { Heading } from '@atta/ui'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SessionList } from './components/SessionList'
import { getOrCreateUser, listSessions } from '@/db/queries'

export default async function HistoryPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId, '')
  const sessions = await listSessions(user.id)

  return (
    <main className='min-h-dvh px-6 py-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='mb-8 flex items-center justify-between'>
          <Heading level={1} size='sm' className='font-light'>
            Past Deliberations
          </Heading>
          <Link href='/' className='text-sm text-primary underline-offset-4 hover:underline'>
            New deliberation
          </Link>
        </div>
        <SessionList
          sessions={sessions.map((s) => ({
            id: s.id,
            question: s.question,
            terminalState: s.terminalState,
            state: s.state,
            createdAt: s.createdAt?.toISOString() ?? new Date().toISOString()
          }))}
        />
      </div>
    </main>
  )
}
