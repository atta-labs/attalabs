import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { Flex, Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AgentPromptBlock } from './_components/AgentPromptBlock'
import { CommandLine } from './_components/CommandLine'
import { GateRefusalDemo } from './_components/GateRefusalDemo'
import { PackageManagerTabs } from './_components/PackageManagerTabs'

export const metadata: Metadata = {
  title: 'Quick Start · Vinaya'
}

// Hand-authored product page — five fixed steps, deliberately NOT derived
// from forge state, matching `roadmap/page.tsx`'s reasoning exactly: a forge
// query spawns a `gh` subprocess, which 500s in prod on Vercel. This route
// has no forge dependency and cannot fail that way.
//
// Step order is fixed at five, no more and no fewer (Issue #682): install,
// govern, watch a gate fire, point an agent at it, watch it run.
const STEPS: { number: number; title: string; body: string[]; render: () => ReactNode }[] = [
  {
    number: 1,
    title: 'Install',
    body: ['Placeholder prose — replaced in Part 3.'],
    render: () => (
      <PackageManagerTabs
        commands={{
          npm: 'npx vinaya init',
          pnpm: 'pnpm dlx vinaya init',
          yarn: 'yarn dlx vinaya init',
          bun: 'bunx vinaya init'
        }}
      />
    )
  },
  {
    number: 2,
    title: 'Govern your repo',
    body: ['Placeholder prose — replaced in Part 3.'],
    render: () => <CommandLine command='vinaya init' />
  },
  {
    number: 3,
    title: 'Watch a gate fire',
    body: ['Placeholder prose — replaced in Part 3.'],
    render: () => <GateRefusalDemo />
  },
  {
    number: 4,
    title: 'Point your agent at it',
    body: ['Placeholder prose — replaced in Part 3.'],
    render: () => <AgentPromptBlock />
  },
  {
    number: 5,
    title: 'Watch it run',
    body: ['Placeholder prose — replaced in Part 3.'],
    render: () => <CommandLine command='vinaya studio' />
  }
]

export default function QuickStartPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-10 px-8 py-8'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Quick Start
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          Five steps from nothing to a governed repo with an agent working inside it.
        </Text>
      </section>

      <section className='flex flex-col gap-6'>
        {STEPS.map((step) => (
          <Card key={step.number}>
            <CardHeader>
              <Flex align='center' gap={4}>
                <Flex
                  align='center'
                  justify='center'
                  className='size-10 shrink-0 rounded-md border border-border bg-accent font-serif text-lg text-accent-foreground'
                >
                  {step.number}
                </Flex>
                <CardTitle className='font-serif text-xl font-normal text-foreground'>{step.title}</CardTitle>
              </Flex>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              {step.body.map((paragraph) => (
                <Text key={paragraph} as='p' className='font-sans text-sm text-muted-foreground'>
                  {paragraph}
                </Text>
              ))}
              {step.render()}
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
