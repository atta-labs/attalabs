import { auth } from '@atta/auth/hooks'
import { Text } from '@atta/ui'
import { redirect } from 'next/navigation'
import { getSessionWithTranscript } from '@/db/queries'
import { DeliberationFeed } from './components/DeliberationFeed'

export default async function DeliberationPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const { id } = await params
  const session = await getSessionWithTranscript(id)

  if (!session) {
    return (
      <div className='flex min-h-dvh items-center justify-center'>
        <Text as='p' muted>
          Session not found.
        </Text>
      </div>
    )
  }

  const initialEntries = session.transcriptEntries.map((e) => ({
    agent: e.agent,
    content: e.content,
    round: e.round
  }))

  return (
    <DeliberationFeed
      sessionId={id}
      question={session.question}
      agentRoles={session.agents}
      initialEntries={initialEntries}
      initialConclusion={session.conclusion}
      initialState={session.state}
    />
  )
}
