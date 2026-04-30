import { Badge } from '@atta/ui/components/badge'

const STATE_CLASSES: Record<string, string> = {
  CLEAN: 'text-success border-success/40',
  REVISED: 'text-warning border-warning/40',
  UNCONVERGED: 'text-destructive border-destructive/40',
  ERROR: 'text-destructive border-destructive/40'
}

export function TerminalStateBadge({ state }: { state: string | null | undefined }) {
  if (!state) return <span className='text-muted-foreground text-xs'>—</span>
  const classes = STATE_CLASSES[state] ?? 'text-muted-foreground border-border'
  return (
    <Badge variant='outline' className={classes}>
      {state}
    </Badge>
  )
}
