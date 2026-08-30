import { Heading, Text } from '@atta/ui/shared'
import { CompareSection } from './CompareSection'

export function CompareHero() {
  return (
    <CompareSection id='hero' className='py-16 sm:py-24 lg:py-28'>
      <Text className='font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground'>compare</Text>
      <Heading
        level={1}
        weight='normal'
        className='mt-5 max-w-4xl text-balance font-serif text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl'
      >
        Governance means something that runs when the rules file is ignored.
      </Heading>
      <Text className='mt-8 max-w-2xl text-balance text-xl leading-relaxed text-muted-foreground'>
        Every framework ships a rules file. The independent evidence below says a rules file rarely changes what an
        agent does on its own — enforcement has to live outside the agent. This page compares what actually enforces,
        not what merely asks.
      </Text>
    </CompareSection>
  )
}
