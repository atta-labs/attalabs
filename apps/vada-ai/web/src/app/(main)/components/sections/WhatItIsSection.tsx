import { Heading, Text } from '@atta/ui/components'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { TwoColumnSection } from '../primitives/TwoColumnSection'

export function WhatItIsSection() {
  return (
    <SectionWrapper id='what-it-is'>
      <TwoColumnSection
        left={
          <div className='flex flex-col gap-8'>
            <SectionLabel>01 / What It Is</SectionLabel>
            <Heading level={2} className='font-serif text-4xl md:text-6xl text-success leading-tight'>
              <span className='block'>You bring a question.</span>
              <span className='block'>A room deliberates.</span>
            </Heading>
            <Text as='p' className='text-muted-foreground max-w-xl leading-relaxed'>
              Vāda runs a team of AI models on your question. Each model reasons independently. Each sees what the
              others said. You get the full deliberation — the disagreements, the convergence, the synthesis. Not one
              answer. A room&apos;s verdict.
            </Text>
          </div>
        }
        right={
          <div className='flex flex-col gap-4 pt-4 md:pt-16'>
            {[
              { step: '01', label: 'You submit a question.' },
              { step: '02', label: 'Each model reasons independently.' },
              { step: '03', label: 'Models read each other and respond.' },
              { step: '04', label: 'A synthesizer reconciles their positions.' },
              { step: '05', label: 'You receive the verdict and the full transcript.' }
            ].map(({ step, label }) => (
              <div key={step} className='flex items-start gap-4 border-l border-border pl-4'>
                <Text as='small' className='font-mono text-xs text-muted-foreground/60 pt-0.5 shrink-0'>
                  {step}
                </Text>
                <Text as='p' className='text-sm text-muted-foreground leading-relaxed'>
                  {label}
                </Text>
              </div>
            ))}
          </div>
        }
      />
    </SectionWrapper>
  )
}
