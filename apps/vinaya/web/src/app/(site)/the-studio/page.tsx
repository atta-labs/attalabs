import { Card, CardContent } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight, MonitorSmartphone } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Studio · Vinaya'
}

export default function TheStudioPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-10 px-6 py-24'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          The Studio
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          Vinaya Studio is the governance dashboard — the live derived-status viewer for this repo&rsquo;s projects,
          iterations, and backlog.
        </Text>
      </section>

      <Card className='border-border bg-card'>
        <CardContent className='space-y-4 pt-6'>
          <div className='flex items-start gap-3'>
            <MonitorSmartphone className='size-5 shrink-0 translate-y-0.5 text-muted-foreground' aria-hidden />
            <Text as='p' className='font-sans text-sm text-foreground'>
              Studio is local-only for Vinaya v1.0. The dashboard reads live GitHub state using your own
              checkout&rsquo;s credentials.
            </Text>
          </div>
          <Text as='p' className='font-sans text-sm text-muted-foreground'>
            Run it locally to see Projects, Iterations, and Backlog.
          </Text>
          <NextLink
            href='/studio/docs'
            variant='unstyled'
            className='inline-flex items-center gap-1.5 font-sans text-sm text-accent hover:underline'
          >
            The methodology docs are public — browse them at /studio/docs
            <ArrowRight className='size-4' aria-hidden />
          </NextLink>
        </CardContent>
      </Card>
    </main>
  )
}
