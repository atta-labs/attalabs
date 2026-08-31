import { Heading, Text } from '@atta/ui/shared'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline } from '../../_components/landing/SectionHeading'

export function CompareHero() {
  return (
    <LandingSection id='hero' background='bg-background text-foreground' py='spacious'>
      <SectionOverline className='text-muted-foreground'>compare</SectionOverline>
      <Heading
        level={1}
        weight='normal'
        className='mt-5 max-w-4xl text-balance font-serif text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl'
      >
        Governance means something that runs when the rules file is ignored.
      </Heading>
      <Text className='mt-8 max-w-2xl text-balance text-xl leading-relaxed text-muted-foreground'>
        Every framework has an instruction layer. The evidence below shows those instructions can steer agents — but
        they cannot reliably self-enforce prohibitions, human gates, or other constraints where failure must be
        impossible. This page compares what actually enforces, not what merely asks.
      </Text>
    </LandingSection>
  )
}
