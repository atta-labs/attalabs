import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { LoopComposition } from '../_components/LoopComposition'

export const metadata: Metadata = {
  title: 'Overview · Vinaya',
  description: 'The nouns of the loop and the loop itself — the conceptual introduction to shipping with Vinaya.'
}

/** The conceptual introduction to Ship with Vinaya: the noun vocabulary and
 * the loop composition, moved unchanged from the old `/start` landing (which
 * now redirects to `/start/quick`). Same reasoning as `/roadmap`: no forge
 * dependency, no `@atta/aeg-core` import, so it stays live in prod. */
export default function StartOverviewPage() {
  return (
    <article className='flex flex-col gap-10'>
      <header className='flex flex-col gap-3'>
        <Heading level={1} className='font-serif font-light tracking-normal leading-tight text-foreground'>
          Overview
        </Heading>
        <Text size='lg' muted className='leading-relaxed'>
          The things the loop passes around, and the shape of the loop that passes them.
        </Text>
      </header>

      <LoopComposition />
    </article>
  )
}
