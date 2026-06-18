import { Heading, Text } from '@atta/ui/components'
import { DeliberateAction } from '../home/DeliberateAction'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'

export function TryItSection() {
  return (
    <SectionWrapper id='try-it'>
      <div className='flex flex-col items-center gap-8 text-center'>
        <SectionLabel>03 / Try It</SectionLabel>
        <Heading level={2} className='font-serif text-4xl md:text-6xl text-foreground leading-tight max-w-xl'>
          Bring a question.
        </Heading>
        <Text as='p' className='text-muted-foreground max-w-sm leading-relaxed'>
          A room of AI models will deliberate on it. You get the full transcript — the disagreement, the convergence,
          the verdict.
        </Text>
        <DeliberateAction />
      </div>
    </SectionWrapper>
  )
}
