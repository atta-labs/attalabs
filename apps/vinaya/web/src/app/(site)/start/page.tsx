import { Card, CardContent } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { START_NAV } from './_components/start-nav'

export const metadata: Metadata = {
  title: 'Start · Vinaya',
  description: 'The adopter’s path: install Vinaya, then ship your first feature under it.'
}

/** Hand-authored landing for the section, same reasoning as `/roadmap`: no
 * forge dependency, no `@atta/aeg-core` import, so it stays live in prod. */
export default function StartLandingPage() {
  return (
    <article className='flex flex-col gap-10 pt-4'>
      <header className='flex flex-col gap-3'>
        <Heading level={1} className='font-serif font-light tracking-normal leading-tight text-foreground'>
          Start
        </Heading>
        <Text size='lg' muted className='leading-relaxed'>
          Four steps to a governed repo, then one short page per stage of the loop that follows.
        </Text>
      </header>

      {START_NAV.map((section) => (
        <section key={section.label} className='flex flex-col gap-4'>
          <Heading level={2} className='font-serif text-xl font-normal text-foreground'>
            {section.label}
          </Heading>
          <div className='flex flex-col gap-3'>
            {section.items.map((item) => (
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
      ))}
    </article>
  )
}
