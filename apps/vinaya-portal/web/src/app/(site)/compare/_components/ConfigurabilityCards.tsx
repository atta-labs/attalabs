import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { ArrowRight, ListChecks, UserCog, Workflow } from 'lucide-react'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline } from '../../_components/landing/SectionHeading'

const CARDS = [
  {
    icon: ListChecks,
    title: 'Your checks',
    body: 'Every check — core or yours — is the same CheckSpec. vinaya new check scaffolds a custom one into your own repo; the runner never treats it as second-class.'
  },
  {
    icon: Workflow,
    title: 'Your CI',
    body: 'The generated workflows are yours the moment init writes them. Edit the YAML, add a job, wire in an external validator, test suite, or policy check — the merge gate stays the merge gate.'
  },
  {
    icon: UserCog,
    title: 'Your process',
    body: 'Roles are built to extend, adjust, or replace: vinaya new role scaffolds an additive contract, and principals / briefSchema bend the gates around your team’s own review and forge rules.'
  }
] as const

export function ConfigurabilityCards() {
  return (
    <LandingSection id='configurability' background='bg-background text-foreground'>
      <SectionOverline className='text-muted-foreground'>configurability</SectionOverline>
      <div className='mt-4 flex flex-wrap items-end justify-between gap-6'>
        <Text className='max-w-xl text-balance font-serif text-3xl leading-tight tracking-tight sm:text-4xl'>
          It brings defaults, not a cage
        </Text>
        <NextLink
          href='/docs/config'
          variant='unstyled'
          className='inline-flex items-center gap-2 border-b border-current pb-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em]'
        >
          See every key <ArrowRight className='size-3.5' />
        </NextLink>
      </div>

      <div className='mt-10 grid gap-6 sm:grid-cols-3'>
        {CARDS.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className='size-5 text-primary' aria-hidden />
              <CardTitle className='mt-3 font-serif text-xl font-normal tracking-tight'>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className='leading-relaxed text-muted-foreground'>{body}</Text>
            </CardContent>
          </Card>
        ))}
      </div>
    </LandingSection>
  )
}
