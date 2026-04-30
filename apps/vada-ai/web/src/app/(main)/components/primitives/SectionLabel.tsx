import { Text } from '@atta/ui'
import { cn } from '@atta/ui/lib/utils'

interface SectionLabelProps {
  children: string
  className?: string
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <Text as='small' className={cn('font-mono uppercase tracking-widest text-xs text-muted-foreground', className)}>
      {children}
    </Text>
  )
}
