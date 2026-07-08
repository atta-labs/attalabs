import { ExternalLink } from 'lucide-react'
import { Badge } from '@atta/ui'

export function SourceLinkChip({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} target='_blank' rel='noreferrer' className='inline-flex'>
      <Badge className='gap-1 border-border bg-muted font-mono text-[0.7rem] text-muted-foreground hover:border-accent hover:text-accent'>
        <ExternalLink className='size-3' />
        {label}
      </Badge>
    </a>
  )
}
