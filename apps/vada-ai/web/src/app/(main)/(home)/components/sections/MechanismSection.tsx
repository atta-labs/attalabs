import { Heading, Text } from '@atta/ui'
import type { AgentCardData } from '../primitives/AgentCard'
import { AgentGrid } from '../primitives/AgentGrid'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { BYOKCallout } from './mechanism/BYOKCallout'
import { ConclusionFlow } from './mechanism/ConclusionFlow'
import { RoundGeometry, type RoundState } from './mechanism/RoundGeometry'

interface RoundSpec {
  title: string
  state: RoundState
}

const ROUNDS: RoundSpec[] = [
  { title: 'Round 1 · Orthogonal', state: 'orthogonal' },
  { title: 'Round 2 · Adversarial', state: 'adversarial' },
  { title: 'Round 3 · Convergence', state: 'convergence' }
]

const MECHANISM_AGENTS: AgentCardData[] = [
  {
    agent: 'strategist',
    name: 'Strategist',
    role: 'Maps the landscape.',
    voice: 'Maps the landscape. Here is the map.'
  },
  {
    agent: 'critic',
    name: 'Critic',
    role: 'Finds what is wrong.',
    voice: 'Finds what is wrong. Here is where the map is wrong.'
  },
  {
    agent: 'devils_advocate',
    name: "Devil's Advocate",
    role: 'Rejects the frame.',
    voice: 'Rejects the frame. We should not be making a map at all.'
  },
  {
    agent: 'synthesizer',
    name: 'Synthesizer',
    role: 'Draws threads together.',
    voice: 'Draws threads together. Here is what we know, and here is what we broke.'
  }
]

export function MechanismSection() {
  return (
    <SectionWrapper id='mechanism'>
      <div className='flex flex-col gap-20'>
        <div className='flex flex-col gap-8'>
          <SectionLabel>03 / The Mechanism</SectionLabel>
          <Heading level={2} className='font-serif text-4xl md:text-6xl text-foreground leading-tight'>
            <span className='block'>Four agents. Three rounds.</span>
            <span className='block'>One conclusion.</span>
          </Heading>
        </div>

        <AgentGrid agents={MECHANISM_AGENTS} />

        <div className='flex flex-col gap-6'>
          <div className='grid gap-4 md:grid-cols-3'>
            {ROUNDS.map(({ title, state }) => (
              <div key={state} className='flex flex-col gap-3'>
                <Text
                  as='small'
                  className='text-center font-mono uppercase tracking-widest text-xs text-muted-foreground'
                >
                  {title}
                </Text>
                <div className='aspect-square rounded-md border border-border bg-background/40 p-5'>
                  <RoundGeometry state={state} />
                </div>
              </div>
            ))}
          </div>
          <Text as='p' className='text-center italic text-sm text-muted-foreground'>
            The language between rounds is never compressed. The specific words are the data.
          </Text>
        </div>

        <div className='flex flex-col gap-10'>
          <ConclusionFlow />
          <Text as='p' className='text-center italic text-lg text-muted-foreground'>
            &ldquo;Most AI products hide their uncertainty.{' '}
            <span className='font-medium not-italic text-primary'>Vāda names it.</span>&rdquo;
          </Text>
        </div>

        <BYOKCallout />
      </div>
    </SectionWrapper>
  )
}
