'use client'

import { Heading } from '@atta/ui'
import { VadaAgent as AIAgent, type AgentName } from '@/components/agents'
import { mdxComponents } from '@/components/mdx/MDXComponents'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { StatusFooter } from '../primitives/StatusFooter'
import { TwoColumnSection } from '../primitives/TwoColumnSection'
import { ArchitectureDiagram } from './ArchitectureDiagram'

const P = mdxComponents.p as React.ComponentType<{ children: React.ReactNode; className?: string }>
const Blockquote = mdxComponents.blockquote as React.ComponentType<{ children: React.ReactNode; className?: string }>

const POSITIONING_AGENTS: Array<{ id: string; name: AgentName }> = [
  { id: 'positioning-strategist', name: 'Strategist' },
  { id: 'positioning-critic', name: 'Critic' },
  { id: 'positioning-devils-advocate', name: "Devil's Advocate" },
  { id: 'positioning-synthesizer', name: 'Synthesizer' }
]

export function PositioningSection() {
  return (
    <SectionWrapper id='positioning'>
      <TwoColumnSection
        className='md:grid-cols-[1.2fr_1fr]'
        left={
          <div className='flex flex-col gap-8'>
            <SectionLabel>01 / Positioning</SectionLabel>

            <Heading level={2} className='font-serif text-4xl md:text-6xl text-primary leading-tight'>
              <span className='block'>Vāda is not a factory.</span>
              <span className='block'>Vāda is deliberation.</span>
            </Heading>

            <P className='max-w-xl'>
              The AI industry is racing to build better factories. Agent swarms that browse the web, read codebases,
              execute tasks at lightspeed. These are execution tools, and they have a blind spot. They assume the
              question is the right question. Give an execution swarm a bad idea and it will execute it perfectly.
            </P>

            <Blockquote className='max-w-xl'>
              <P>
                Vāda sits above execution. You bring a decision to Vāda before you commit resources to it — to
                stress-test the strategy, attack the assumptions, and find the blind spots.
              </P>
            </Blockquote>

            <StatusFooter
              label='Closed-Room Protocol'
              body='No external tools. No web access. No code execution. The friction of the debate must not be diluted.'
            />
          </div>
        }
        right={
          <div className='flex flex-col gap-8'>
            <div className='flex flex-wrap justify-center gap-6 sm:gap-10'>
              {POSITIONING_AGENTS.map((agent) => (
                <AIAgent
                  key={agent.id}
                  id={agent.id}
                  name={agent.name}
                  size='sm'
                  state='speaking'
                  showMatrix={true}
                  particleCount={25}
                  noLabel
                />
              ))}
            </div>
            <div className='bg-background/80 border  p-4 px-6'>
              <ArchitectureDiagram />
            </div>
          </div>
        }
      />
    </SectionWrapper>
  )
}
