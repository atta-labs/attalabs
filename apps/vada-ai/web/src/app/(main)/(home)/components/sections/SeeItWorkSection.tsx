import { Heading, Text } from '@atta/ui'
import type { ReactNode } from 'react'
import type { AgentCardData } from '../primitives/AgentCard'
import { AgentGrid } from '../primitives/AgentGrid'
import { ConclusionCard, type ConclusionField } from '../primitives/ConclusionCard'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'

const ROUND_1_AGENTS: AgentCardData[] = [
  { agent: 'strategist', name: 'Strategist', role: 'Maps the opportunity.' },
  { agent: 'critic', name: 'Critic', role: 'Goes to the numbers.' },
  { agent: 'devils_advocate', name: "Devil's Advocate", role: 'Why Europe specifically?' },
  { agent: 'synthesizer', name: 'Synthesizer', role: 'Notes a latent disagreement.' }
]

const ROUND_2_AGENTS: AgentCardData[] = [
  {
    agent: 'strategist',
    name: 'Strategist',
    role: 'Pushes back: a partnership model changes everything.'
  },
  {
    agent: 'critic',
    name: 'Critic',
    role: 'Agrees the "why Europe" question is the right one.'
  },
  {
    agent: 'devils_advocate',
    name: "Devil's Advocate",
    role: "Shifts: if partnership works, the financial concern disappears — but do the partner's incentives align?"
  },
  {
    agent: 'synthesizer',
    name: 'Synthesizer',
    role: 'Notes the evolving consensus around partnership conditions.'
  }
]

const CONCLUSION_FIELDS: ConclusionField[] = [
  { label: 'Recommendation', value: 'Pursue European expansion via partnership.' },
  { label: 'Key condition', value: 'Identify a viable partner within 60 days.' },
  { label: 'Unresolved', value: 'Whether domestic product-market fit is truly established.' }
]

interface PhaseProps {
  label: string
  children: ReactNode
}

function Phase({ label, children }: PhaseProps) {
  return (
    <div className='grid gap-4 md:grid-cols-[160px_1fr] md:gap-8'>
      <Text as='small' className='block font-mono uppercase tracking-widest text-xs text-muted-foreground md:pt-1'>
        {label}
      </Text>
      <div>{children}</div>
    </div>
  )
}

export function SeeItWorkSection() {
  return (
    <SectionWrapper id='see-it-work' className='bg-card'>
      <div className='flex flex-col gap-16'>
        <div className='flex flex-col gap-8'>
          <SectionLabel>02 / See It Work</SectionLabel>
          <Heading level={2} className='max-w-3xl font-serif text-3xl md:text-5xl text-foreground leading-tight'>
            A founder is deciding whether to expand internationally.
          </Heading>
          <div className='flex max-w-2xl flex-col gap-2 rounded-md border border-border bg-card/40 p-5'>
            <Text as='small' className='font-mono uppercase tracking-widest text-xs text-muted-foreground'>
              INPUT_QUERY
            </Text>
            <Text as='p' className='italic text-base text-foreground leading-relaxed'>
              &ldquo;Should we expand to Europe this year or consolidate the US market first?&rdquo;
            </Text>
          </div>
        </div>

        <div className='flex flex-col gap-12'>
          <Phase label='Round 1 · Orthogonal'>
            <AgentGrid agents={ROUND_1_AGENTS} />
          </Phase>

          <Phase label='Round 2 · Adversarial'>
            <AgentGrid agents={ROUND_2_AGENTS} />
          </Phase>

          <Phase label='Round 3 · Convergence'>
            <blockquote className='border-l-4 border-success bg-card/20 px-6 py-5'>
              <Text as='p' className='text-lg md:text-xl text-foreground leading-relaxed'>
                &ldquo;The question has evolved from &lsquo;expand or not&rsquo; to &lsquo;is there a viable
                partner?&rsquo;&rdquo;
              </Text>
            </blockquote>
          </Phase>

          <Phase label='Conclusion'>
            <ConclusionCard state='Clean' fields={CONCLUSION_FIELDS} hideTitle />
          </Phase>
        </div>

        <Text as='p' className='mx-auto max-w-3xl text-center text-lg md:text-xl text-muted-foreground leading-relaxed'>
          The question she walked in with has been replaced by a better question.{' '}
          <span className='font-medium text-success'>That reframe is the product.</span>
        </Text>
      </div>
    </SectionWrapper>
  )
}
