import { Heading, Text } from '@atta/ui'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'

interface Negation {
  headline: string
  subline: string
}

const NEGATIONS: Negation[] = [
  {
    headline: 'Vāda is not a chatbot.',
    subline: 'No memory. No personality. No ongoing relationship.'
  },
  {
    headline: 'Vāda is not a swarm.',
    subline: "No tools. No file access. No code execution. Agents think. They don't act."
  },
  {
    headline: 'Vāda is not a workflow.',
    subline: 'No steps. No automation. No integrations.'
  },
  {
    headline: 'Vāda is not trying to be helpful.',
    subline: 'It is trying to be right.'
  }
]

export function NegationsSection() {
  return (
    <SectionWrapper id='what-this-is-not' innerClassName='max-w-3xl'>
      <div className='flex flex-col gap-16 md:gap-20'>
        <SectionLabel>05 / What This Is Not</SectionLabel>

        <div className='flex flex-col gap-14 md:gap-20'>
          {NEGATIONS.map(({ headline, subline }) => (
            <div key={headline} className='flex flex-col gap-3'>
              <Heading level={3} className='font-serif text-3xl md:text-5xl text-success leading-tight'>
                {headline}
              </Heading>
              <Text as='p' className='text-lg text-muted-foreground leading-relaxed'>
                {subline}
              </Text>
            </div>
          ))}
        </div>

        <div className='flex flex-col gap-5 pt-10 md:pt-16'>
          <Heading level={2} className='font-serif text-5xl md:text-7xl text-success leading-tight'>
            Vāda is a room.
          </Heading>
          <Text as='p' className='text-xl text-muted-foreground leading-relaxed'>
            Agents enter. They deliberate. A conclusion exits.
          </Text>
        </div>
      </div>
    </SectionWrapper>
  )
}
