import { Text } from '@atta/ui'
import { SessionCard } from './SessionCard'

interface Session {
  id: string
  question: string
  terminalState: string | null
  state: string
  createdAt: string
}

export function SessionList({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <Text as='p' size='sm' muted className='py-12 text-center'>
        No deliberations yet.
      </Text>
    )
  }

  return (
    <div className='space-y-3'>
      {sessions.map((s) => (
        <SessionCard
          key={s.id}
          id={s.id}
          question={s.question}
          terminalState={s.terminalState}
          state={s.state}
          createdAt={s.createdAt}
        />
      ))}
    </div>
  )
}
