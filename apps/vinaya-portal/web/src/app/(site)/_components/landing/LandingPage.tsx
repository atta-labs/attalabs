import { Card, CardContent, CardHeader, CardTitle, Code } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import { VinayaHeroEmblem } from '../hero-canvas/VinayaHeroEmblem'
import { ButtonLink } from './ButtonLink'
import { CommandCopy, EnforcementRatio, RevealGrid, RingProgress, ScrollToSectionButton } from './LandingInteractions'
import { LifecycleHarnessSection } from './LifecycleHarnessSection'
import { LifecycleSection } from './LifecycleSection'
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
    <VinayaHeroEmblem
      landingActions={<ScrollToSectionButton targetId='own-your-code'>View more</ScrollToSectionButton>}
    />
  )
}

function OwnershipSection() {
  const cells = [
    ['before the work', 'Be in the plan'],
    ['during the work', 'Read every pull request'],
    ['after it merges', 'Know what changed, and why']
  ] as const

  return (
    <section
      id='own-your-code'
      className='border-b-2 border-secondary-foreground bg-secondary text-secondary-foreground'
    >
      <div className='mx-auto max-w-[73.75rem] px-6 py-14 sm:px-10 sm:py-20 lg:py-24'>
        <div className='grid gap-12 text-center md:grid-cols-2 md:items-start md:gap-16 md:text-left'>
          <div>
            <SectionOverline className='text-secondary-foreground/65'>what you get back</SectionOverline>
            <SectionTitle className='mt-5'>Own your code again</SectionTitle>
            <Text className='mt-7 font-serif text-2xl leading-snug tracking-tight text-secondary-foreground/65 sm:text-3xl'>
              The ticket goes into a subscription.
              <br />
              The diff comes back too big to read.
              <br />
              Nobody chose that debt.
            </Text>
          </div>
          <RevealGrid className='grid gap-4'>
            {cells.map(([overline, title], index) => (
              <Card
                key={overline}
                className={`translate-y-3.5 text-left opacity-0 transition-all duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100 ${index === 1 ? 'delay-[90ms]' : index === 2 ? 'delay-[180ms]' : ''}`}
              >
                <CardHeader className='px-9'>
                  <Text className='font-mono text-[0.625rem] uppercase tracking-[0.2em] text-secondary-foreground/65'>
                    {overline}
                  </Text>
                  <CardTitle className='mt-4 font-serif text-3xl font-normal leading-none tracking-tight sm:text-4xl'>
                    {title}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </RevealGrid>
        </div>
      </div>
    </section>
  )
}

function VerificationSection({ releaseMetrics }: { releaseMetrics: ReleaseMetrics }) {
  const enforcementRatio = Math.round(
    (releaseMetrics.executableLines / (releaseMetrics.executableLines + releaseMetrics.doctrineLines)) * 100
  )
  const formattedExecutableLines = releaseMetrics.executableLines.toLocaleString('en-US')
  const formattedDoctrineLines = releaseMetrics.doctrineLines.toLocaleString('en-US')

  return (
    <section className='border-b-2 border-border'>
      <div className='mx-auto max-w-[73.75rem] px-6 py-14 sm:px-10 sm:py-20 lg:py-24'>
        <div className='grid gap-12 text-center md:grid-cols-2 md:items-start md:gap-16 md:text-left'>
          <div>
            <SectionTitle leading='tight' className='mx-auto max-w-xl md:mx-0'>
              Vinaya’s governance is executable
            </SectionTitle>
            <Text className='mx-auto mt-8 max-w-xl border-l-4 border-border pl-7 text-left text-xl leading-relaxed text-muted-foreground md:mx-0'>
              A 2026 study: randomly-generated rule files moved agent behaviour about as much as carefully curated ones.{' '}
              <strong className='font-semibold text-foreground'>Instructions are not constraint.</strong>
            </Text>
            <div className='mt-10'>
              <ActionLink href='/compare' variant='secondary'>
                Compare the approaches <ArrowRight className='size-4' />
              </ActionLink>
            </div>
          </div>
          <div className='md:text-center'>
            <EnforcementRatio value={enforcementRatio} />
            <Text className='mt-4 font-mono text-xs leading-loose tracking-wide text-muted-foreground'>
              measured at v{releaseMetrics.version} — {formattedExecutableLines} lines of code that enforces the flow
              <br />
              against {formattedDoctrineLines} lines of doctrine · counted at every release
            </Text>
          </div>
        </div>
      </div>
    </section>
  )
}

function RingsSection() {
  const rings = [
    ['ring 0', 'your machine', "Clean, or it doesn't push", false],
    ['ring 1', 'the forge', 'Clean, or it doesn’t merge', false],
    ['ring 2', 'audits', 'Drift gets caught later', true]
  ] as const

  return (
    <section className='bg-secondary text-secondary-foreground'>
      <div className='mx-auto max-w-[73.75rem] px-6 py-14 sm:px-10 sm:py-20 lg:py-24'>
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
        <div className='mt-7 text-center'>
          <UnderlineLink href='/docs/rings'>See more</UnderlineLink>
        </div>
      </div>
    </section>
  )
}

function AudienceSection() {
  const audiences = [
    [
      'for the cto',
      'Every change traceable',
      'Brief, checks, and approval live on every task’s PR. Three years from now, you can still answer why.'
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
    ],
    [
      'for the product manager',
      'See where everything is. Without asking',
      'Status is read live from GitHub — planned, in progress, in review, done. Nobody updates a board. It can’t be stale.'
    ],
    [
      'for the junior engineer',
      'Learn the way the team ships',
      'Plan, brief, develop, review — the same loop every time, and you can take any step in it. You review real PRs, and the gates catch you before the team has to.'
    ],
    [
      'for the founder',
      'Your team uses AI. Your repo stays sane',
      'Everyone ships with whatever AI they like — same gates, one process, one clean history. And the token ledger shows what each feature cost.'
    ]
  ] as const

  return (
    <section className='border-b-2 border-border'>
      <div className='mx-auto max-w-[73.75rem] px-6 py-14 sm:px-10 sm:py-20 lg:py-24'>
        <SectionTitle className='text-center'>Who it’s for</SectionTitle>
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
                <CardTitle className='mt-4 font-serif text-3xl font-normal leading-none tracking-tight'>
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent className='px-8'>
                <Text className='leading-relaxed text-muted-foreground'>{body}</Text>
              </CardContent>
            </Card>
          ))}
        </RevealGrid>
      </div>
    </section>
  )
}

function ConfigurationSection() {
  return (
    <section className='bg-secondary text-secondary-foreground'>
      <div className='mx-auto max-w-[73.75rem] px-6 py-16 sm:px-10 sm:py-24 lg:py-28'>
        <div className='mx-auto max-w-5xl text-center'>
          <SectionTitle>Configure your own lifecycle</SectionTitle>
          <Text className='mt-7 font-serif text-2xl leading-snug tracking-tight text-secondary-foreground/65 sm:text-3xl'>
            Nobody wants someone else’s. So nothing runs that you can’t see, and nothing is hard to undo.
          </Text>
        </div>

        <RevealGrid className='mt-16 grid gap-4 md:grid-cols-3'>
          <Card className='translate-y-3.5 opacity-0 transition-all duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100'>
            <CardHeader className='px-9'>
              <Text className='font-mono text-[0.625rem] uppercase tracking-[0.2em] text-secondary-foreground/65'>
                configuration
              </Text>
              <CardTitle className='mt-4 font-serif text-4xl font-normal leading-none tracking-tight'>
                Make it yours
              </CardTitle>
            </CardHeader>
            <CardContent className='px-9'>
              <ul className='flex flex-col gap-2 text-lg'>
                {['Extend a role, or add your own', 'Add your own checks', 'Tune the rings'].map((item) => (
                  <li key={item} className='flex items-baseline gap-3'>
                    <span className='size-1.5 shrink-0 rounded-full bg-secondary-foreground' /> {item}
                  </li>
                ))}
              </ul>
              <div className='mt-6'>
                <UnderlineLink href='/config'>Configuration</UnderlineLink>
              </div>
            </CardContent>
          </Card>
          <Card className='translate-y-3.5 opacity-0 transition-all delay-[90ms] duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100'>
            <CardHeader className='px-9'>
              <Text className='font-mono text-[0.625rem] uppercase tracking-[0.2em] text-secondary-foreground/65'>
                fully resolved
              </Text>
              <CardTitle className='mt-4 font-serif text-4xl font-normal leading-none tracking-tight'>
                See it before it runs
              </CardTitle>
            </CardHeader>
            <CardContent className='px-9'>
              <Code className='border border-secondary-foreground/50 bg-secondary-foreground/10 text-secondary-foreground'>
                vinaya check --plan
              </Code>
            </CardContent>
          </Card>
          <Card className='translate-y-3.5 opacity-0 transition-all delay-[180ms] duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100'>
            <CardHeader className='px-9'>
              <Text className='font-mono text-[0.625rem] uppercase tracking-[0.2em] text-secondary-foreground/65'>
                zero lock-in
              </Text>
              <CardTitle className='mt-4 font-serif text-4xl font-normal leading-none tracking-tight'>
                Leave any time
              </CardTitle>
            </CardHeader>
            <CardContent className='px-9'>
              <Code className='border border-secondary-foreground/50 bg-secondary-foreground/10 text-secondary-foreground'>
                vinaya eject
              </Code>
            </CardContent>
          </Card>
        </RevealGrid>

        <div className='mt-14 text-center'>
          <Text className='mx-auto max-w-4xl font-serif text-2xl leading-snug tracking-tight sm:text-3xl'>
            No account. Nothing phones home.
            <br />
            Every file it touches is diff-and-confirm.
          </Text>
          <div className='mt-9 flex flex-wrap justify-center gap-4'>
            <Code className='inline-flex h-13 items-center border-2 border-secondary-foreground bg-secondary-foreground/10 px-5 font-mono text-base text-secondary-foreground'>
              vinaya check --plan
            </Code>
            <ButtonLink
              href='/docs/cli'
              variant='outline'
              className='border-secondary-foreground bg-secondary-foreground font-mono text-xs uppercase tracking-[0.16em] text-secondary shadow-none'
            >
              The full reference <ArrowRight className='size-4' />
            </ButtonLink>
          </div>
          <div className='mt-7 flex justify-center gap-6'>
            <UnderlineLink href='/docs/cli'>See more</UnderlineLink>
            <UnderlineLink href='/config'>Config</UnderlineLink>
          </div>
        </div>

        <Card className='mt-16'>
          <CardContent className='flex flex-col items-start justify-between gap-10 px-10 lg:flex-row lg:items-center'>
            <div>
              <Heading
                level={3}
                weight='normal'
                className='font-serif text-3xl leading-tight tracking-tight sm:text-4xl'
              >
                Vinaya governs its own development
              </Heading>
              <Text className='mt-3 max-w-2xl text-lg leading-relaxed text-secondary-foreground/65'>
                Every task pull request carries its brief, its checks, and two independent verdicts. Open one and look.
              </Text>
            </div>
            <ButtonLink
              href='https://github.com'
              variant='outline'
              className='shrink-0 border-secondary-foreground font-mono text-xs uppercase tracking-[0.16em] text-secondary-foreground shadow-none'
            >
              See a governed PR <ArrowRight className='size-4' />
            </ButtonLink>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function FinalSection() {
  return (
    <>
      <section className='border-b-2 border-border'>
        <div className='mx-auto max-w-[73.75rem] px-6 py-16 text-center sm:px-10 sm:py-24 lg:py-28'>
          <SectionTitle>Start in your repo</SectionTitle>
          <div className='mt-11 flex flex-wrap justify-center gap-4'>
            <CommandCopy command={QUICKSTART_COMMAND} />
            <ActionLink href='/docs/cli'>Quick Start</ActionLink>
          </div>
        </div>
      </section>
      <footer className='mx-auto flex max-w-[73.75rem] flex-wrap justify-between gap-6 px-6 py-12 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground sm:px-10'>
        <span>Vinaya — Governance Layer</span>
        <span>Docs · Compare · Security · Governance · GitHub · Status</span>
      </footer>
    </>
  )
}

export function LandingPage({ releaseMetrics }: { releaseMetrics: ReleaseMetrics }) {
  return (
    <main>
      <HeroSection />
      <OwnershipSection />
      <LifecycleHarnessSection />
      <LifecycleSection />
      <VerificationSection releaseMetrics={releaseMetrics} />
      <RingsSection />
      <AudienceSection />
      <ConfigurationSection />
      <FinalSection />
    </main>
  )
}
