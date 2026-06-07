import { Badge } from '@atta/ui/components'

const DIAGNOSIS_CLASSES: Record<string, string> = {
  VADA_WON: 'text-success border-success/40',
  BASELINE_WON: 'text-destructive border-destructive/40',
  TIE: 'text-muted-foreground border-border',
  NEGLIGIBLE_DIFFERENCE: 'text-muted-foreground border-border',
  PIPELINE_FAILURE: 'text-warning border-warning/40',
  A: 'text-success border-success/40',
  B: 'text-destructive border-destructive/40',
  UNJUDGED: 'text-muted-foreground border-border'
}

export function DiagnosisBadge({ diagnosis }: { diagnosis: string | null | undefined }) {
  const value = diagnosis ?? 'UNJUDGED'
  const classes = DIAGNOSIS_CLASSES[value] ?? 'text-muted-foreground border-border'
  return (
    <Badge variant='outline' className={classes}>
      {value}
    </Badge>
  )
}
