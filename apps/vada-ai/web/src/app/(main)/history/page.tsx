import { auth } from '@atta/auth/hooks'
import { Separator } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { redirect } from 'next/navigation'
import { HistoryClientView } from './components/HistoryClientView'
import { getOrCreateUser, listSessions } from '@/db/queries'

export default async function HistoryPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user = await getOrCreateUser(clerkId, '')
  const sessions = await listSessions(user.id)

  return (
    <main className='min-h-dvh px-6 py-16'>
      <div className='mx-auto max-w-2xl space-y-10'>
        {/* Header */}
        <div className='space-y-4'>
          <span className='font-mono text-xs text-muted-foreground'>History</span>
          <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
            Your Deliberations
          </Heading>
          <Text as='p' muted className='text-lg leading-relaxed'>
            A record of every room you have opened. Search to revisit a past deliberation, or start a new one.
          </Text>
        </div>

        <Separator className='opacity-20' />

        <HistoryClientView
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
