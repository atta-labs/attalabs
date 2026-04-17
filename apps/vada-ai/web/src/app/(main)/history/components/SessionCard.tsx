import { Badge, Card, CardContent } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import Link from 'next/link'

const STATE_CONFIG: Record<string, { label: string; className: string }> = {
  CLEAN: { label: 'Clean', className: 'text-success border-success/40' },
  REVISED: { label: 'Revised', className: 'text-warning border-warning/40' },
  UNCONVERGED: { label: 'Unconverged', className: 'text-destructive border-destructive/40' },
  SPARRING_COMPLETE: { label: 'Sparring', className: 'text-primary border-primary/40' }
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
  const date = new Date(createdAt)

  return (
    <Link href={`/deliberation/${id}`} className='block transition-opacity hover:opacity-80'>
      <Card className='border border-border bg-transparent [background:none] py-0 shadow-none'>
        <CardContent className='flex items-start gap-4 px-4 py-3'>
          <Text as='p' size='sm' className='line-clamp-2 flex-1'>
            {question}
          </Text>
          <div className='flex shrink-0 flex-col items-end gap-1.5'>
            <Badge variant='outline' size='xs' className={cn('uppercase tracking-wider', stateClass)}>
              {stateLabel}
            </Badge>
            <Text as='small' size='xs' muted className='tabular-nums'>
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' · '}
              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </Text>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
