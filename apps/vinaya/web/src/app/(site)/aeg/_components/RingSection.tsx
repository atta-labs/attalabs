import { Card, CardContent } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import type { Ring } from '@/lib/aeg'
import { MarkdownInline } from './MarkdownInline'
import { RingRowItem } from './RingRowItem'

export function RingSection({ ring }: { ring: Ring }) {
  return (
    <div className='flex flex-col gap-4'>
      <Heading level={3} className='font-serif text-xl text-foreground'>
        Ring {ring.label}
      </Heading>
      <Card className='border-border bg-card'>
        <CardContent className='grid grid-cols-1 gap-4 p-6 sm:grid-cols-3'>
          <div className='flex flex-col gap-1'>
            <Text size='xs' className='font-mono uppercase tracking-wide text-muted-foreground'>
              Where
            </Text>
            <MarkdownInline text={ring.where} className='text-sm text-foreground' />
          </div>
          <div className='flex flex-col gap-1'>
            <Text size='xs' className='font-mono uppercase tracking-wide text-muted-foreground'>
              What happens on violation
            </Text>
            <MarkdownInline text={ring.whatHappensOnViolation} className='text-sm text-foreground' />
          </div>
          <div className='flex flex-col gap-1'>
            <Text size='xs' className='font-mono uppercase tracking-wide text-muted-foreground'>
              Who pays
            </Text>
            <MarkdownInline text={ring.whoPays} className='text-sm text-foreground' />
          </div>
        </CardContent>
      </Card>

      <div className='flex flex-col gap-3'>
        {ring.rows.map((row) => (
          <RingRowItem key={row.line} row={row} headers={ring.detailHeaders} />
        ))}
      </div>
    </div>
  )
}
