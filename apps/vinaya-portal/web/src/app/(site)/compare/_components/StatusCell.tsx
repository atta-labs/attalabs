import { cn } from '@atta/ui/lib/utils'
import { Check, Minus, TriangleAlert, X } from 'lucide-react'

export type Status = 'yes' | 'no' | 'diy' | 'dash'

// Legend, fixed across every table on this page: success = yes, warning = DIY/partial,
// destructive = no (reads as "needs a gate" in context), muted = not applicable.
const STYLE: Record<Status, { icon: typeof Check; className: string; label: string }> = {
  yes: { icon: Check, className: 'text-success', label: 'Yes' },
  no: { icon: X, className: 'text-destructive', label: 'No' },
  diy: { icon: TriangleAlert, className: 'text-warning', label: 'DIY' },
  dash: { icon: Minus, className: 'text-muted-foreground', label: '—' }
}

export function StatusCell({ status, label }: { status: Status; label?: string }) {
  const { icon: Icon, className, label: defaultLabel } = STYLE[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-mono text-sm', className)}>
      <Icon className='size-4 shrink-0' aria-hidden />
      {label ?? defaultLabel}
    </span>
  )
}
