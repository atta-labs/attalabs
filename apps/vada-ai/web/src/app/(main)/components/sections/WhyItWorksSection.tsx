import { Heading, Text } from '@atta/ui/components'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { TwoColumnSection } from '../primitives/TwoColumnSection'

export function WhyItWorksSection() {
  return (
    <SectionWrapper id='why-it-works'>
      <TwoColumnSection
        left={
          <div className='flex flex-col gap-8'>
            <SectionLabel>02 / Why It Works</SectionLabel>
            <Heading level={2} className='font-serif text-4xl md:text-6xl text-success leading-tight'>
              <span className='block'>Disagreement</span>
              <span className='block'>is the signal.</span>
            </Heading>
            <Text as='p' className='text-muted-foreground max-w-xl leading-relaxed'>
              A single model cannot see its own blind spots. When models disagree, that disagreement is information — it
              marks the genuine uncertainty in the question. Vāda surfaces that. You learn not just what the models
              think, but where they diverge and why.
            </Text>
            <blockquote className='border-l-4 border-success pl-5 py-1 max-w-xl'>
              <Text as='p' className='text-foreground leading-relaxed'>
                One model gives you its best guess. A room gives you the shape of the problem.
              </Text>
            </blockquote>
          </div>
        }
        right={
          <div className='flex flex-col gap-6 pt-4 md:pt-16'>
            <div className='border border-border rounded-md p-5 flex flex-col gap-2'>
              <Text as='small' className='font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
                Single model
              </Text>
              <Text as='p' className='text-sm text-muted-foreground leading-relaxed'>
                Returns a confident answer. Blind spots are invisible. You cannot tell what it missed.
              </Text>
            </div>
            <div className='flex items-center justify-center'>
              <div className='h-px w-8 bg-border' />
              <Text as='small' className='font-mono text-xs text-success mx-3 uppercase tracking-widest'>
                vs
              </Text>
              <div className='h-px w-8 bg-border' />
            </div>
            <div className='border border-success/40 rounded-md p-5 flex flex-col gap-2'>
              <Text as='small' className='font-mono text-xs uppercase tracking-widest text-success/70'>
                Room of models
              </Text>
              <Text as='p' className='text-sm text-muted-foreground leading-relaxed'>
                Disagreement is explicit. Convergence is earned. You see exactly where confidence is real.
              </Text>
            </div>
          </div>
        }
      />
    </SectionWrapper>
  )
}
