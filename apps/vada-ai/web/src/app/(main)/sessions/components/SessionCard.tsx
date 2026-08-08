import { Badge, Card, CardContent, ModelIcon } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { NextLink } from '@atta/ui/lib/next-link'

const STATE_CONFIG: Record<string, { label: string; className: string }> = {
  CLEAN: { label: 'Clean', className: 'text-success border-success/40' },
  REVISED: { label: 'Revised', className: 'text-warning border-warning/40' },
  UNCONVERGED: { label: 'Unconverged', className: 'text-destructive border-destructive/40' },
  SPARRING_COMPLETE: { label: 'Sparring', className: 'text-primary border-primary/40' },
  ERROR: { label: 'Error', className: 'text-destructive border-destructive/40' }
}

export function SessionCard({
  id,
  question,
  terminalState,
  agentModels,
  createdAt
}: {
  id: string
  question: string
  terminalState: string | null
  state: string
  agentModels: Record<string, { provider: string; modelId: string }> | null
  createdAt: string
}) {
  const config = terminalState ? STATE_CONFIG[terminalState] : null
  const stateLabel = config?.label ?? 'In Progress'
  const stateClass = config?.className ?? 'text-muted-foreground border-border'
  const date = new Date(createdAt)

  return (
    <NextLink variant='card' href={`/deliberation/${id}`}>
      <Card className='border border-border bg-transparent [background:none] py-0 shadow-none'>
        <CardContent className='flex items-start gap-4 px-4 py-3'>
          <Text as='p' size='sm' className='line-clamp-2 flex-1'>
            {question}
          </Text>
          {(() => {
            const modelIds = Array.from(new Set(Object.values(agentModels ?? {}).map((m) => m.modelId)))
            const shown = modelIds.slice(0, 3)
            const overflow = modelIds.length - shown.length
            return shown.length > 0 ? (
              <span className='flex shrink-0 items-center gap-0.5'>
                {shown.map((mid) => (
                  <ModelIcon
                    key={mid}
                    model={mid}
                    size={12}
                    type='avatar'
                    className='-ml-1 rounded-full bg-background p-px ring-1 ring-border first:ml-0'
                  />
                ))}
                {overflow > 0 && <span className='ml-1 font-mono text-[10px] text-muted-foreground'>+{overflow}</span>}
              </span>
            ) : null
          })()}
          <div className='flex shrink-0 flex-col items-end gap-1.5'>
            <Badge variant='outline' className={cn('uppercase tracking-wider', stateClass)}>
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
    </NextLink>
  )
}
