import { Text } from '@atta/ui/shared'
import { SessionCard } from './SessionCard'

interface Session {
  id: string
  question: string
  terminalState: string | null
  state: string
  agentModels: Record<string, { provider: string; modelId: string }> | null
  createdAt: string
}

export function SessionList({
  sessions,
  emptyMessage = 'No deliberations yet.'
}: {
  sessions: Session[]
  emptyMessage?: string
}) {
  if (sessions.length === 0) {
    return (
      <Text as='p' size='sm' muted className='py-12 text-center'>
        {emptyMessage}
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
          agentModels={s.agentModels}
          createdAt={s.createdAt}
        />
      ))}
    </div>
  )
}
