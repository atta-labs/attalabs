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
    <SectionWrapper id='what-this-is-not' className='bg-card'>
      <div className='flex flex-col gap-12 md:gap-16'>
        <SectionLabel>04 / What This Is Not</SectionLabel>

        <div className='grid gap-12 md:grid-cols-2 md:gap-x-16 md:gap-y-16'>
          {NEGATIONS.map(({ headline, subline }) => (
            <div key={headline} className='flex flex-col gap-3'>
              <Heading level={3} className='font-serif text-3xl md:text-4xl lg:text-5xl text-primary leading-tight'>
                {headline}
              </Heading>
              <Text as='p' className='text-base md:text-lg text-muted-foreground leading-relaxed'>
                {subline}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
