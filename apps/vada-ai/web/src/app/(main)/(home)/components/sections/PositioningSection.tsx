import { Heading, Text } from '@atta/ui'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { StatusFooter } from '../primitives/StatusFooter'
import { TwoColumnSection } from '../primitives/TwoColumnSection'
import { PositioningDiagram } from './PositioningDiagram'

export function PositioningSection() {
  return (
    <SectionWrapper id='positioning'>
      <TwoColumnSection
        className='md:grid-cols-[1.2fr_1fr]'
        left={
          <div className='flex flex-col gap-8'>
            <SectionLabel>01 / Positioning</SectionLabel>

            <Heading level={2} className='font-serif text-4xl md:text-6xl text-success leading-tight'>
              <span className='block'>Vāda is not a factory.</span>
              <span className='block'>Vāda is deliberation.</span>
            </Heading>

            <Text as='p' className='text-muted-foreground max-w-xl leading-relaxed'>
              The AI industry is racing to build better factories. Agent swarms that browse the web, read codebases,
              execute tasks at lightspeed. These are execution tools, and they have a blind spot. They assume the
              question is the right question. Give an execution swarm a bad idea and it will execute it perfectly.
            </Text>

            <blockquote className='border-l-4 border-success pl-5 py-1 max-w-xl'>
              <Text as='p' className='text-foreground leading-relaxed'>
                Vāda sits above execution. You bring a decision to Vāda before you commit resources to it — to
                stress-test the strategy, attack the assumptions, and find the blind spots.
              </Text>
            </blockquote>

            <StatusFooter
              label='Closed-Room Protocol'
              body='No external tools. No web access. No code execution. The friction of the debate must not be diluted.'
            />
          </div>
        }
        right={<PositioningDiagram />}
      />
    </SectionWrapper>
  )
}
