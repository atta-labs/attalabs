import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { VinayaHeroEmblem } from '../hero-canvas/VinayaHeroEmblem'
import { LetterReveal } from '../LetterReveal'
import { ConfigBoardSection } from './ConfigBoardSection'
import { HarnessDiagramSection } from './HarnessDiagramSection'
import { LabeledCommandCopy, RevealGrid, ScrollToSectionButton } from './LandingInteractions'
import { LandingSection } from './LandingSection'
import { LifecycleSection } from './LifecycleSection'
import { OwnershipSection } from './OwnershipSection'
import { SectionOverline, SectionTitle } from './SectionHeading'
import { StudioSection } from './StudioSection'
import { UnderlineLink } from './UnderlineLink'

const QUICKSTART_COMMAND = 'npx @attalabs/vinaya quickstart'

interface ReleaseMetrics {
  version: string
  executableLines: number
  doctrineLines: number
}

function HeroSection() {
  return (
    <VinayaHeroEmblem landingActions={<ScrollToSectionButton targetId='tagline'>View more</ScrollToSectionButton>} />
  )
}

function AudienceSection() {
  const audiences = [
    [
      'for the engineer',
      'You ship the feature',
      'You define the milestone and ground it in tasks. Agents write and review. You control the merge.'
    ],
    ['for the tech lead', 'Your standards, enforced', 'Your standards become checks every pull request must pass.'],
    ['for the founder', 'One process', 'The feature lands through one process, so you can still answer why it shipped.']
  ] as const

  return (
    <LandingSection background='bg-secondary text-secondary-foreground' py='spacious'>
      <SectionTitle size='compact' className='text-center'>
        <LetterReveal text='Who it’s for' />
      </SectionTitle>
      <RevealGrid className='mt-12 grid gap-4 md:grid-cols-3'>
        {audiences.map(([overline, title, body], index) => (
          <Card
            key={overline}
            className={`translate-y-12 scale-[0.96] opacity-0 transition-[opacity,transform] duration-700 ease-out group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:scale-100 group-data-[visible=true]/reveal:opacity-100 motion-reduce:transition-none ${index === 0 ? 'border-2 border-foreground' : 'border border-border'} ${index === 1 ? 'delay-[140ms]' : index === 2 ? 'delay-[280ms]' : ''}`}
          >
            <CardHeader className='px-8'>
              <Text className='font-mono text-[0.625rem] uppercase tracking-[0.02em] text-muted-foreground'>
                {overline}
              </Text>
              <CardTitle className='mt-4 min-h-[2.3em] font-serif text-[1.375rem] font-normal leading-[1.15] tracking-[-0.02em]'>
                {title}
              </CardTitle>
              <span
                aria-hidden='true'
                className={`mt-4 block h-0.5 origin-left scale-x-0 bg-current opacity-25 transition-transform duration-700 ease-out group-data-[visible=true]/reveal:scale-x-100 motion-reduce:transition-none ${index === 1 ? 'delay-[440ms]' : index === 2 ? 'delay-[580ms]' : 'delay-300'}`}
              />
            </CardHeader>
            <CardContent className='px-8'>
              <Text className='leading-[1.65] text-muted-foreground'>{body}</Text>
            </CardContent>
          </Card>
        ))}
      </RevealGrid>
    </LandingSection>
  )
}

function ZeroLockInSection() {
  return (
    <LandingSection
      background='bg-secondary text-secondary-foreground'
      py='compact'
      center
      className='flex min-h-screen flex-col items-center justify-center gap-5 py-[clamp(2.5rem,7vh,6rem)]'
    >
      <SectionOverline className='text-sm text-muted-foreground'>zero lock-in</SectionOverline>
      <SectionTitle size='compact'>
        <LetterReveal text='In with one command' />
        <br />
        <LetterReveal text='Out with one command' startIndex={20} />
      </SectionTitle>

      <div className='mt-[clamp(1rem,3vh,2rem)] flex flex-col items-center justify-center gap-[clamp(0.75rem,2.5vh,1.75rem)] min-[820px]:flex-row'>
        <LabeledCommandCopy href='/docs/cli#command-quickstart' label='plug in' command={QUICKSTART_COMMAND} />
        <Text className='font-mono text-[2rem] leading-none text-muted-foreground min-[820px]:pt-[1.6rem]'>
          <span className='min-[820px]:hidden'>⇅</span>
          <span className='hidden min-[820px]:inline'>⇄</span>
        </Text>
        <LabeledCommandCopy href='/docs/cli#command-eject' label='unplug' command='vinaya eject' />
      </div>
      <Text className='mt-6 max-w-xl text-balance text-xl leading-relaxed text-muted-foreground'>
        Eject removes exactly what quickstart installed. Nothing else.
      </Text>
      <UnderlineLink href='/docs/cli'>See the CLI</UnderlineLink>
    </LandingSection>
  )
}

// `releaseMetrics` is unused: nothing on Home renders it. Drop this prop together with the
// `getPublishedReleaseMetrics` fetch in `(site)/page.tsx` that supplies it.
export function LandingPage(_props: { releaseMetrics: ReleaseMetrics }) {
  return (
    <main>
      <HeroSection />
      <LifecycleSection />
      <OwnershipSection />
      <HarnessDiagramSection />
      <StudioSection />
      <AudienceSection />
      <ConfigBoardSection />
      <ZeroLockInSection />
    </main>
  )
}
