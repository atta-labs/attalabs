import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { GitPullRequestArrow, ShieldOff, Timer } from 'lucide-react'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'

const CARDS = [
  {
    icon: GitPullRequestArrow,
    title: 'A pull request controls its own check',
    body: 'A pull_request-triggered workflow runs the PR’s own copy of the YAML — its author controls the workflow definition producing the required check, and can edit any step to exit 0, reporting success under the required name having run nothing at all.'
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
  { label: 'Superpowers', href: 'https://github.com/obra/superpowers' },
  { label: 'GitHub Spec Kit', href: 'https://github.com/github/spec-kit' },
  { label: 'OpenSpec', href: 'https://github.com/Fission-AI/OpenSpec' },
  { label: 'BMAD-METHOD', href: 'https://github.com/bmad-code-org/BMAD-METHOD' },
  { label: 'GitHub Agentic Workflows (gh-aw)', href: 'https://github.com/github/gh-aw' }
] as const

export function NotDoesSection() {
  return (
    <LandingSection id='not-does' background='bg-background text-foreground'>
      <SectionOverline className='text-center text-muted-foreground'>honest limits</SectionOverline>
      <SectionTitle className='mt-4 text-center' leading='tight'>
        What Vinaya does not do
      </SectionTitle>

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
    </LandingSection>
  )
}

// Kept as a sibling export in this file (rather than its own file) — the sources
// list is a short, static footer-like block with no state of its own; splitting
// it out would add a file for one <ul>. Rendered after CloserSection in page.tsx
// so the page ends on the quickstart CTA the way /life-cycle's own closer does,
// not on a link list.
export function SourcesSection() {
  return (
    <LandingSection id='sources' background='bg-background text-foreground'>
      <Heading level={2} weight='normal' className='text-center font-serif text-xl tracking-tight'>
        Sources
      </Heading>
      <ul className='mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3'>
        {SOURCES.map((source) => (
          <li key={source.href}>
            <NextLink href={source.href} variant='subtle' target='_blank' rel='noreferrer'>
              {source.label}
            </NextLink>
          </li>
        ))}
      </ul>
    </LandingSection>
  )
}
