import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Flex, Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { ArrowUpRight, BookOpen, GitBranch, Terminal, Workflow } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Docs — Vinaya',
  description: 'The harness, the state machine, the CLI, and the generated reference — Vinaya’s documentation.'
}

/**
 * The `/docs` hub: four cards, one per doc surface now living under
 * `/docs/*`. This page holds no forge/model dependency of its own — it is
 * pure navigation, unlike the pages it links to.
 */
const CARDS = [
  {
    href: '/docs/harness',
    Icon: Workflow,
    title: 'The Harness',
    description: 'The interactive map of every role, contract, gate, and check — drawn live from doctrine.'
  },
  {
    href: '/docs/state-machine',
    Icon: GitBranch,
    title: 'State Machine',
    description: 'How forge facts and labels derive task status — inputs, rules, and the statuses they conclude.'
  },
  {
    href: '/docs/cli',
    Icon: Terminal,
    title: 'CLI',
    description: 'Every `vinaya` command — flags, behavior, and shipped-vs-planned status.'
  },
  {
    href: '/docs/reference',
    Icon: BookOpen,
    title: 'Reference',
    description: 'The harness, part by part — every role, contract, and gate as one browsable map.'
  }
] as const

export default function DocsHubPage() {
  return (
    <main className='mx-auto flex max-w-5xl flex-col gap-10 px-8 py-8'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Docs
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          Vinaya’s documentation surfaces — pick where you want to start.
        </Text>
      </section>

      <div className='grid gap-4 sm:grid-cols-2'>
        {CARDS.map(({ href, Icon, title, description }) => (
          <Card key={href} className='h-full bg-card'>
            <CardHeader>
              <Flex align='center' gap={2}>
                <Icon className='h-5 w-5 text-muted-foreground' aria-hidden />
                <CardTitle className='font-serif text-xl text-card-foreground'>{title}</CardTitle>
              </Flex>
            </CardHeader>
            <CardContent className='flex h-full flex-col gap-3'>
              <Text size='sm' className='font-sans text-card-foreground leading-relaxed'>
                {description}
              </Text>
              <NextLink
                href={href}
                variant='link'
                className='mt-auto inline-flex w-fit items-center gap-1 pt-1 text-card-foreground text-sm hover:text-primary'
              >
                Read more
                <ArrowUpRight className='h-3.5 w-3.5' />
              </NextLink>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
