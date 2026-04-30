import type { Metadata } from 'next'
import { Heading, Text } from '@atta/ui/shared'

export const metadata: Metadata = {
  title: 'Teams'
}

export default function TeamsPage() {
  return (
    <div className='px-6 py-12'>
      <div className='mx-auto max-w-2xl space-y-6'>
        <div className='space-y-4'>
          <span className='font-mono text-xs text-muted-foreground'>Catalog</span>
          <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
            Deliberation Teams
          </Heading>
          <Text as='p' muted className='text-lg leading-relaxed'>
            Browse the catalog of curated deliberation teams. Each team combines agents with specific expertise and
            perspectives to answer your questions better.
          </Text>
        </div>
      </div>
    </div>
  )
}
