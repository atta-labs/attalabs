import { ArrowRight } from 'lucide-react'
import { Button, Card, CardContent } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import Link from 'next/link'

// Final section — three destination cards, each with a reason to go there:
//   • the Harness → understand the model
//   • the docs    → evaluate the rules
//   • the roadmap → follow the build (honest third route while install isn't available)
const DESTINATIONS = [
  {
    title: 'UNDERSTAND THE HARNESS',
    body: 'See how roles, contracts, checks, and merges fit together.',
    label: 'Explore the Harness',
    href: '/the-harness'
  },
  {
    title: 'READ THE RULEBOOK',
    body: 'Inspect the standards that govern execution.',
    label: 'Read the docs',
    href: '/docs'
  },
  {
    title: 'FOLLOW THE BUILD',
    body: 'See the next milestone and what Vinaya is becoming.',
    label: 'View the roadmap',
    href: '/roadmap'
  }
]

export function CtaSection() {
  return (
    <section className='flex w-full flex-col items-center gap-8 text-center'>
      <Heading
        level={2}
        className='max-w-[720px] text-balance font-sans text-2xl leading-tight font-extrabold tracking-tight text-foreground sm:text-2xl md:text-3xl'
      >
        Start with the part that matters to you.
      </Heading>

      <div className='grid w-full max-w-[1000px] grid-cols-1 gap-6 sm:grid-cols-3'>
        {DESTINATIONS.map((dest) => (
          <Card key={dest.title} className='h-full w-full text-left'>
            <CardContent className='flex h-full flex-col gap-3'>
              <Text as='p' className='font-mono text-sm font-bold uppercase tracking-wider text-foreground'>
                {dest.title}
              </Text>
              <Text className='font-sans text-base leading-relaxed text-muted-foreground'>{dest.body}</Text>
              <Button asChild size='lg' variant='outline' className='mt-auto'>
                <Link href={dest.href}>
                  {dest.label}
                  <ArrowRight className='size-4' />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
