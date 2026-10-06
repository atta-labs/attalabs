import { Text } from '@atta/ui/shared'
import { LabeledCommandCopy } from './LandingInteractions'
import { LandingSection } from './LandingSection'
import { SectionOverline, SectionTitle } from './SectionHeading'
import { UnderlineLink } from './UnderlineLink'
import { WipeReveal } from './WipeReveal'

const QUICKSTART_COMMAND = 'npx @attalabs/vinaya quickstart'

// 08 · Close. The install and the eject, side by side.
export function ZeroLockInSection() {
  return (
    <LandingSection
      background='bg-secondary text-secondary-foreground'
      py='compact'
      center
      className='flex min-h-screen flex-col items-center justify-center gap-5 py-[clamp(2.5rem,7vh,6rem)]'
    >
      <SectionOverline className='text-sm text-muted-foreground'>zero lock-in</SectionOverline>
      <SectionTitle size='compact' wipe={false}>
        <WipeReveal>In with one command</WipeReveal>
        <WipeReveal late>Out with one command</WipeReveal>
      </SectionTitle>

      <div className='mt-[clamp(1rem,3vh,2rem)] flex flex-col items-center justify-center gap-[clamp(0.75rem,2.5vh,1.75rem)] min-[820px]:flex-row'>
        <LabeledCommandCopy href='/docs/cli#command-quickstart' label='plug in' command={QUICKSTART_COMMAND} />
        <Text className='font-mono text-5xl leading-none text-muted-foreground min-[820px]:pt-[2.2rem]'>
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
