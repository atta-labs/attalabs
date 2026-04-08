import { auth } from '@atta/auth/hooks'
import { Heading, Text } from '@atta/ui'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DeliberationView } from './components/DeliberationView'
import { getSessionWithTranscript } from '@/db/queries'

export default async function DeliberationPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const { id } = await params
  const session = await getSessionWithTranscript(id)

  if (!session) {
    return (
      <main className='flex min-h-dvh items-center justify-center'>
        <Text as='p' muted>
          Session not found.
        </Text>
      </main>
    )
  }

  const initialEntries = session.transcriptEntries.map((e) => ({
    agent: e.agent,
    content: e.content,
    round: e.round
  }))

  return (
    <main className='min-h-dvh px-6 py-8'>
      <div className='mx-auto max-w-2xl'>
        <div className='mb-8 flex items-center justify-between'>
          <Link href='/' className='text-sm text-muted-foreground transition-colors hover:text-foreground'>
            ← Back
          </Link>
          <Link href='/history' className='text-sm text-muted-foreground transition-colors hover:text-foreground'>
            History
          </Link>
        </div>

        <Heading level={2} size='sm' className='mb-8 text-center font-light'>
          {session.question}
        </Heading>

        <DeliberationView
          sessionId={id}
          initialEntries={initialEntries}
          initialConclusion={session.conclusion}
          initialState={session.state}
          agentRoles={session.agents}
        />
      </div>
    </main>
  )
}
