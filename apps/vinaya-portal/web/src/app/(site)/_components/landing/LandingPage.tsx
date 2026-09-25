import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import { VinayaHeroEmblem } from '../hero-canvas/VinayaHeroEmblem'
import { LetterReveal } from '../LetterReveal'
import { ButtonLink } from './ButtonLink'
import { ConfigBoardSection } from './ConfigBoardSection'
import { HarnessDiagramSection } from './HarnessDiagramSection'
import { CommandCopy, CommandLinkChip, RevealGrid, RingProgress, ScrollToSectionButton } from './LandingInteractions'
import { LandingSection } from './LandingSection'
import { LifecycleSection } from './LifecycleSection'
import { OwnershipSection } from './OwnershipSection'
import { SectionOverline, SectionTitle } from './SectionHeading'

const QUICKSTART_COMMAND = 'npx @attalabs/vinaya quickstart'

interface ReleaseMetrics {
  version: string
  executableLines: number
  doctrineLines: number
}

function ActionLink({
  href,
  children,
  variant = 'default'
}: {
  href: string
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline'
}) {
  return (
    <ButtonLink href={href} variant={variant} className='font-mono text-xs uppercase tracking-[0.16em]'>
      {children}
    </ButtonLink>
  )
}

function UnderlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <NextLink
      href={href}
      variant='unstyled'
      className='inline-flex items-center gap-2 border-b border-current pb-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em]'
    >
      {children}
      <ArrowRight className='size-3.5' />
    </NextLink>
  )
}

function HeroSection() {
  return (
    <VinayaHeroEmblem landingActions={<ScrollToSectionButton targetId='tagline'>View more</ScrollToSectionButton>} />
  )
}

function RingsSection() {
  const rings = [
    ['ring 0', 'your machine', "Clean, or it doesn't push", false],
    ['ring 1', 'the forge', 'Clean, or it doesn’t merge', false],
    ['ring 2', 'audits', 'Drift gets caught later', true]
  ] as const

  return (
    <LandingSection background='bg-secondary text-secondary-foreground'>
      <SectionTitle className='mx-auto max-w-5xl text-center'>
        Three rings. The first two run identical code
      </SectionTitle>
      <div className='mt-14 grid gap-4 md:grid-cols-3'>
        {rings.map(([ring, place, title, delayed]) => (
          <Card key={ring}>
            <CardHeader className='px-8'>
              <Text
                className={`font-mono text-4xl font-semibold leading-none tracking-tight sm:text-5xl ${delayed ? 'text-secondary-foreground/65' : ''}`}
              >
                {ring}
              </Text>
              <Text className='mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-secondary-foreground/65'>
                {place}
              </Text>
              <CardTitle className='mt-5 font-serif text-2xl font-normal leading-tight tracking-tight'>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-8'>
              <RingProgress delayed={delayed} />
            </CardContent>
          </Card>
        ))}
      </div>
      <Text className='mx-auto mt-12 max-w-4xl text-center font-serif text-2xl leading-snug tracking-tight sm:text-3xl'>
        The hook on your laptop and the required check in CI
        <br />
        are the same code.
      </Text>
      <div className='mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3'>
        <UnderlineLink href='/docs/rings'>See more</UnderlineLink>
        <UnderlineLink href='/compare'>Why this beats a rules file</UnderlineLink>
      </div>
    </LandingSection>
  )
}

function AudienceSection() {
  const audiences = [
    [
      'for the founder / cto',
      'Your team uses AI. Your repo stays sane',
      'Everyone ships with whatever AI they like — same gates, one process, one clean history. Brief, checks, and approval live on every task’s PR, so three years from now you can still answer why.'
    ],
    [
      'for the tech lead',
      'Your standards, enforced without you',
      'Team conventions become checks every PR must pass. You stop policing merges by hand — the gates hold the line while you build.'
    ],
    [
      'for the engineer',
      'Bring your own agent',
      'Cursor, Claude Code, Codex — your choice. Vinaya checks the merge, not the model. And your teammates’ PRs arrive one task at a time, small enough to actually review.'
    ]
  ] as const

  return (
    <LandingSection background='bg-background text-foreground'>
      <SectionTitle className='text-center'>
        <LetterReveal text='Who it’s for' />
      </SectionTitle>
      <RevealGrid className='mt-12 grid gap-4 md:grid-cols-3'>
        {audiences.map(([overline, title, body], index) => (
          <Card
            key={overline}
            className={`translate-y-3.5 opacity-0 transition-all duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100 ${index % 3 === 1 ? 'delay-[90ms]' : index % 3 === 2 ? 'delay-[180ms]' : ''}`}
          >
            <CardHeader className='px-8'>
              <Text className='font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground'>
                {overline}
              </Text>
              <CardTitle className='mt-4 min-h-24 font-serif text-3xl font-normal leading-none tracking-tight'>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className='px-8'>
              <Text className='leading-relaxed text-muted-foreground'>{body}</Text>
            </CardContent>
          </Card>
        ))}
      </RevealGrid>
    </LandingSection>
  )
}

function ZeroLockInSection() {
  return (
    <LandingSection background='bg-secondary/70 text-secondary-foreground' center>
      <SectionOverline className='text-base text-secondary-foreground/65'>zero lock-in</SectionOverline>
      <SectionTitle className='mx-auto mt-5 max-w-2xl'>
        <LetterReveal text='In with one command' />
        <br />
        <LetterReveal text='Out with one command' startIndex={20} />
      </SectionTitle>

      <div className='mx-auto mt-11 flex max-w-md flex-col items-center gap-6 lg:max-w-none lg:flex-row lg:justify-center lg:gap-7'>
        <CommandLinkChip href='/docs/quickstart' label='plug in' command='npx @attalabs/vinaya quickstart' />
        <Text className='rotate-90 font-mono text-4xl text-secondary-foreground/65 lg:rotate-0'>⇄</Text>
        <CommandLinkChip href='/docs/cli/eject' label='unplug' command='vinaya eject' />
      </div>
      <Text className='mx-auto mt-9 max-w-xl text-balance font-serif text-xl leading-relaxed text-secondary-foreground/65'>
        Eject removes exactly what quickstart installed. Nothing else.
      </Text>

      <div className='mt-14 flex justify-center gap-6'>
        <UnderlineLink href='/docs/cli'>See more</UnderlineLink>
        <UnderlineLink href='/config'>Config</UnderlineLink>
      </div>
    </LandingSection>
  )
}

function FinalSection() {
  return (
    <LandingSection background='bg-background text-foreground' py='spacious' center>
      <SectionTitle>
        <LetterReveal text='Start in your repo' />
      </SectionTitle>
      <div className='mt-11 flex flex-wrap justify-center gap-4'>
        <CommandCopy command={QUICKSTART_COMMAND} />
        <ActionLink href='/docs/cli'>Quick Start</ActionLink>
      </div>
    </LandingSection>
  )
}

// `(site)/page.tsx` still fetches and passes the release metrics that the removed
// governance-ratio block rendered. That route file sits outside this change, so the
// prop stays accepted, and unused, until the page stops passing it.
export function LandingPage(_props: { releaseMetrics: ReleaseMetrics }) {
  return (
    <main>
      <HeroSection />
      <LifecycleSection />
      <OwnershipSection />
      <HarnessDiagramSection />
      <RingsSection />
      <AudienceSection />
      <ConfigBoardSection />
      <ZeroLockInSection />
      <FinalSection />
    </main>
  )
}
