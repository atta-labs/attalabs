import { Badge, Card, CardContent } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import type { ContractDoc } from '@/lib/aeg'
import { SourceLinkChip } from './SourceLinkChip'

export function ContractCard({ contract }: { contract: ContractDoc }) {
  return (
    <Card className='border-border bg-card'>
      <CardContent className='flex flex-col gap-3 p-6'>
        <div className='flex items-start justify-between gap-3'>
          <Heading level={3} className='font-serif text-lg text-card-foreground'>
            {contract.title}
          </Heading>
          <Badge className='shrink-0 border-success/40 bg-success/10 text-success'>{contract.status}</Badge>
        </div>
        <Text size='xs' className='font-mono uppercase tracking-wide text-muted-foreground'>
          {contract.seam}
        </Text>
        <Text size='sm' className='font-sans leading-relaxed text-card-foreground'>
          {contract.why}
        </Text>
        <div className='pt-1'>
          <SourceLinkChip label={contract.relPath} href={contract.href} />
        </div>
      </CardContent>
    </Card>
  )
}
