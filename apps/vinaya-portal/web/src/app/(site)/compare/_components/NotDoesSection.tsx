import { Card, CardContent, CardHeader, CardTitle, Code } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { GitPullRequestArrow, ShieldOff, Timer } from 'lucide-react'
import { CompareSection } from './CompareSection'

const CARDS = [
  {
    icon: GitPullRequestArrow,
    title: 'A pull request can delete its own gate',
    body: 'A pull_request-triggered workflow runs the PR’s own copy of the YAML. Its author can delete the step, or the whole workflow, before it ever runs your check.'
  },
  {
    icon: ShieldOff,
    title: 'Branch protection is not optional',
    body: 'Required-check enforcement only exists once branch protection is turned on and the Vinaya check is marked required — a GitHub admin setting Vinaya can’t flip for you. It closes merge-without-a-report and nothing more.'
  },
  {
    icon: Timer,
    title: 'Evidence is checked, not re-run',
    body: 'The evidence block is byte-verified against the PR’s real head sha — that catches a stale or fabricated diff stat. It does not re-run your test suite, and it says nothing about prose elsewhere in the body.'
  }
] as const

const SOURCES = [
  { label: 'arXiv 2607.26819', href: 'https://arxiv.org/abs/2607.26819' },
  { label: 'arXiv 2604.11088', href: 'https://arxiv.org/abs/2604.11088' },
  { label: 'arXiv 2602.11988', href: 'https://arxiv.org/abs/2602.11988' },
  { label: 'GitHub Spec Kit', href: 'https://github.com/github/spec-kit' },
  { label: 'BMAD-METHOD', href: 'https://github.com/bmad-code-org/BMAD-METHOD' },
  { label: 'OpenSpec', href: 'https://github.com/Fission-AI/OpenSpec' },
  { label: 'Kiro hooks', href: 'https://kiro.dev/docs/hooks/' },
  { label: 'GitHub Agentic Workflows (gh-aw)', href: 'https://github.com/github/gh-aw' }
] as const

export function NotDoesSection() {
  return (
    <>
      <CompareSection id='not-does'>
        <Text className='font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground'>
          honest limits
        </Text>
        <Heading
          level={2}
          weight='normal'
          className='mt-4 max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-4xl'
        >
          What Vinaya does not do
        </Heading>

        <div className='mt-10 grid gap-6 sm:grid-cols-3'>
          {CARDS.map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className='size-5 text-muted-foreground' aria-hidden />
                <CardTitle className='mt-3 font-serif text-xl font-normal tracking-tight'>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className='leading-relaxed text-muted-foreground'>{body}</Text>
              </CardContent>
            </Card>
          ))}
        </div>
      </CompareSection>

      <CompareSection id='quickstart' alt className='text-center'>
        <Heading
          level={2}
          weight='normal'
          className='mx-auto max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-4xl'
        >
          Ask for a rules file. Ship a gate.
        </Heading>
        <div className='mt-9 flex flex-col items-center gap-6'>
          <Code className='bg-foreground/10 px-4 py-2 text-base font-bold text-foreground sm:text-lg'>
            npx @attalabs/vinaya quickstart
          </Code>
          <NextLink href='/docs/cli' variant='button'>
            Read the CLI docs
          </NextLink>
        </div>
      </CompareSection>

      <CompareSection id='sources'>
        <Heading level={2} weight='normal' className='font-serif text-xl tracking-tight'>
          Sources
        </Heading>
        <ul className='mt-6 flex flex-wrap gap-x-8 gap-y-3'>
          {SOURCES.map((source) => (
            <li key={source.href}>
              <NextLink href={source.href} variant='subtle' target='_blank' rel='noreferrer'>
                {source.label}
              </NextLink>
            </li>
          ))}
        </ul>
      </CompareSection>
    </>
  )
}
