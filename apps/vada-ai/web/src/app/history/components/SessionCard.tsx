import { Badge, Card, CardContent, Text } from '@atta/ui'
import Link from 'next/link'

const STATE_COLORS: Record<string, string> = {
  CLEAN: '#2ECC71',
  REVISED: '#C8A84B',
  UNCONVERGED: '#DB4A4A'
}

export function SessionCard({
  id,
  question,
  terminalState,
  createdAt
}: {
  id: string
  question: string
  terminalState: string | null
  state: string
  createdAt: string
}) {
  const stateColor = terminalState ? STATE_COLORS[terminalState] : undefined
  const stateLabel = terminalState ?? 'In Progress'

  return (
    <Link href={`/deliberation/${id}`} className='block transition-opacity hover:opacity-80'>
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-start justify-between gap-4'>
            <Text as='p' size='sm' className='line-clamp-2 flex-1'>
              {question}
            </Text>
            <Badge
              variant='outline'
              className='shrink-0 text-[10px] uppercase tracking-wider'
              style={stateColor ? { color: stateColor, borderColor: stateColor } : undefined}
            >
              {stateLabel}
            </Badge>
          </div>
          <Text as='small' size='xs' muted className='mt-2'>
            {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </CardContent>
      </Card>
    </Link>
  )
}
