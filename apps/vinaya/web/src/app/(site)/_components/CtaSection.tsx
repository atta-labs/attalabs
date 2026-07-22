import { ArrowRight } from 'lucide-react'
import { Badge, Button, Card, CardContent } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import Link from 'next/link'

// The one governed execution path — moved here from the Workflow section so it has room to
// read as the closing summary before the "pick a door" cards.
const STAGES = ['PLAN', 'BRIEF', 'BUILD', 'REVIEW', 'VERIFY', 'MERGE', 'ARCHIVE']

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
    <section className='flex w-full flex-col items-center gap-16 text-center'>
      {/* Part 1 — the one governed path */}
      <div className='flex w-full flex-col items-center gap-6'>
        <Heading
          level={2}
          className='text-balance font-sans text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl'
        >
          One governed execution path
        </Heading>
        {/* Chunky filled chips (read as cards over the fabric); tight px so all 7 fit one row. */}
        <div className='flex flex-wrap items-center justify-center gap-x-1.5 gap-y-3'>
          {STAGES.map((stage, i) => (
            <div key={stage} className='flex items-center gap-1.5'>
              <Badge
                variant='secondary'
                className='rounded-md px-4 py-4 font-mono text-sm font-bold tracking-wider text-foreground sm:text-base'
              >
                {stage}
              </Badge>
              {i < STAGES.length - 1 && <ArrowRight className='size-5 shrink-0 text-muted-foreground' />}
            </div>
          ))}
        </div>
      </div>

      {/* Part 2 — pick a door */}
      <div className='flex w-full flex-col items-center gap-8'>
        <Heading
          level={2}
          className='text-balance font-sans text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl md:whitespace-nowrap md:text-4xl'
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
                <Button asChild size='lg' className='mt-auto'>
                  <Link href={dest.href}>
                    {dest.label}
                    <ArrowRight className='size-4' />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
