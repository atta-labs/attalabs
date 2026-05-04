import type { Metadata } from 'next'
import { auth } from '@atta/auth/hooks'

export const metadata: Metadata = {
  title: 'History'
}

import { Separator } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { HistoryClientView } from './components/HistoryClientView'
import { getOrCreateUser, listSessions } from '@/db/queries'

export default async function HistoryPage() {
  const { userId: clerkId } = await auth()

  await getOrCreateUser(clerkId!, '')
  const sessions = await listSessions(clerkId!)

  return (
    <div className='px-6 py-12'>
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
            agentModels: (s.agentModels ?? null) as Record<string, { provider: string; modelId: string }> | null,
            createdAt: s.createdAt?.toISOString() ?? new Date().toISOString()
          }))}
        />
      </div>
    </div>
  )
}
