import { Badge, Card, CardContent } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import Link from 'next/link'

const STATE_CONFIG: Record<string, { label: string; className: string }> = {
  CLEAN: { label: 'Clean', className: 'text-green-500 border-green-500/40' },
  REVISED: { label: 'Revised', className: 'text-yellow-500 border-yellow-500/40' },
  UNCONVERGED: { label: 'Unconverged', className: 'text-destructive border-destructive/40' },
  SPARRING_COMPLETE: { label: 'Sparring', className: 'text-blue-400 border-blue-400/40' }
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
  const config = terminalState ? STATE_CONFIG[terminalState] : null
  const stateLabel = config?.label ?? 'In Progress'
  const stateClass = config?.className ?? 'text-muted-foreground border-border'

  return (
    <Link href={`/deliberation/${id}`} className='block transition-opacity hover:opacity-80'>
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-start justify-between gap-4'>
            <Text as='p' size='sm' className='line-clamp-2 flex-1'>
              {question}
            </Text>
            <Badge variant='outline' className={cn('shrink-0 text-[10px] uppercase tracking-wider', stateClass)}>
              {stateLabel}
            </Badge>
          </div>
          <Text as='small' size='xs' muted className='mt-2'>
            {new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            {new Date(createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </Text>
        </CardContent>
      </Card>
    </Link>
  )
}
