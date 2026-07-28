import { Card, CardContent } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { LoopComposition } from './_components/LoopComposition'
import { START_NAV } from './_components/start-nav'

export const metadata: Metadata = {
  title: 'Start · Vinaya',
  description: 'The adopter’s path: install Vinaya, then ship your first feature under it.'
}

const QUICK_START = START_NAV.find((section) => section.label === 'Quick Start')

/** Hand-authored landing for the section, same reasoning as `/roadmap`: no
 * forge dependency, no `@atta/aeg-core` import, so it stays live in prod.
 * Quick Start stays a plain card list (out of this task's surface); "Ship
 * with Vinaya" renders `LoopComposition` in place of the seven identical
 * cards this replaced — a generic map over `START_NAV`'s sections can't
 * express the loop's actual shape, so the two sections are handled
 * separately rather than through one shared loop. */
export default function StartLandingPage() {
  return (
    <article className='flex flex-col gap-10'>
      <header className='flex flex-col gap-3'>
        <Heading level={1} className='font-serif font-light tracking-normal leading-tight text-foreground'>
          Start
        </Heading>
        <Text size='lg' muted className='leading-relaxed'>
          Four steps to a governed repo, then one short page per stage of the loop that follows.
        </Text>
      </header>

      {QUICK_START && (
        <section className='flex flex-col gap-4'>
          <Heading level={2} className='font-serif text-xl font-normal text-foreground'>
            {QUICK_START.label}
          </Heading>
          <div className='flex flex-col gap-3'>
            {QUICK_START.items.map((item) => (
              <Card key={item.slug}>
                <CardContent>
                  <NextLink
                    href={item.href}
                    variant='unstyled'
                    className='group flex items-center justify-between gap-4 text-foreground'
                  >
                    <span className='font-sans text-base font-medium'>{item.title}</span>
                    <ArrowRight className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                  </NextLink>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className='flex flex-col gap-4'>
        <Heading level={2} className='font-serif text-xl font-normal text-foreground'>
          Ship with Vinaya
        </Heading>
        <LoopComposition />
      </section>
    </article>
  )
}
