import { Card, CardContent } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import type { RoleDoc } from '@/lib/aeg'
import { SourceLinkChip } from './SourceLinkChip'

export function RoleCard({ role }: { role: RoleDoc }) {
  return (
    <Card className='border-border bg-card'>
      <CardContent className='flex flex-col gap-3 p-6'>
        <Heading level={3} className='font-serif text-lg text-card-foreground'>
          {role.title}
        </Heading>
        <Text size='sm' className='font-sans leading-relaxed text-card-foreground'>
          {role.audience}
        </Text>
        <div className='pt-1'>
          <SourceLinkChip label={role.relPath} href={role.href} />
        </div>
      </CardContent>
    </Card>
  )
}
