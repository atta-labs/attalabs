'use client'

import { Heading, Text } from '@atta/ui'
import { VadaAgent as AIAgent, type AgentName } from '@vada/agents'
import { cn } from '@atta/ui/lib/utils'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { TwoColumnSection } from '../primitives/TwoColumnSection'
import type { AgentCardData } from '../primitives/AgentCard'
import type { ConclusionField } from '../primitives/ConclusionCard'

// --- Data Arrays ---
const ROUND_1_AGENTS: AgentCardData[] = [
  { agent: 'strategist', name: 'Strategist', role: 'Maps the opportunity.' },
  { agent: 'critic', name: 'Critic', role: 'Goes to the numbers.' },
  { agent: 'devils_advocate', name: "Devil's Advocate", role: 'Why Europe specifically?' },
  { agent: 'synthesizer', name: 'Synthesizer', role: 'Notes a latent disagreement.' }
]

const ROUND_2_AGENTS: AgentCardData[] = [
  { agent: 'strategist', name: 'Strategist', role: 'Pushes back: a partnership model changes everything.' },
  { agent: 'critic', name: 'Critic', role: 'Agrees the "why Europe" question is the right one.' },
  {
    agent: 'devils_advocate',
    name: "Devil's Advocate",
    role: "Shifts: if partnership works, the financial concern disappears — but do the partner's incentives align?"
  },
  { agent: 'synthesizer', name: 'Synthesizer', role: 'Notes the evolving consensus around partnership conditions.' }
]

const CONCLUSION_FIELDS: ConclusionField[] = [
  { label: 'Recommendation', value: 'Pursue European expansion via partnership.' },
  { label: 'Key condition', value: 'Identify a viable partner within 60 days.' },
  { label: 'Unresolved', value: 'Whether domestic product-market fit is truly established.' }
]

function DownArrow() {
  return (
    <div className='flex justify-center py-2 relative z-10'>
      <div className='w-[2px] h-6 bg-foreground relative'>
        <div className='absolute -bottom-[3px] -left-[3.5px] w-2 h-2 border-r-[1.5px] border-b-[1.5px] border-foreground rotate-45' />
      </div>
    </div>
  )
}

interface RoleCardProps extends AgentCardData {
  index: number
  roundKey: string
}

function RoleCard({ role, agent, index, roundKey }: RoleCardProps) {
  const isTopLeft = index === 0
  const isTopRight = index === 1
  const isBottomLeft = index === 2

  const agentNameMap: Record<string, AgentName> = {
    strategist: 'Strategist',
    critic: 'Critic',
    devils_advocate: "Devil's Advocate",
    synthesizer: 'Synthesizer'
  }

  return (
    <div
      data-agent={agent}
      className={cn(
        'p-3 sm:p-4 border-l-[3px] [border-left-color:var(--agent-color)]',
        isTopLeft && 'border-b border-border sm:border-r',
        isTopRight && 'border-b border-border',
        isBottomLeft && 'border-b border-border sm:border-b-0 sm:border-r'
      )}
    >
      <AIAgent
        id={`${roundKey}-${index}-${agent}`}
        name={agentNameMap[agent] || (agent as AgentName)}
        size='xs'
        labelPosition='right'
        state='speaking'
        showMatrix={true}
        particleCount={25}
      />

      <div className='text-xs text-muted-foreground leading-relaxed'>{role}</div>
    </div>
  )
}

function RoundArena({
  title,
  subtitle,
  agents,
  roundKey
}: {
  title: string
  subtitle: string
  agents: AgentCardData[]
  roundKey: string
}) {
  return (
    <div className='border-[1.5px] border-foreground mb-1'>
      <div className='flex justify-between items-center border-b border-border px-3 py-2 sm:px-4'>
        <span className='font-mono text-[9px] tracking-[0.22em] text-foreground uppercase font-medium'>{title}</span>
        <span className='font-mono text-[9px] tracking-[0.16em] text-muted-foreground uppercase'>{subtitle}</span>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2'>
        {agents.map((agent, i) => (
          <RoleCard key={agent.agent} {...agent} index={i} roundKey={roundKey} />
        ))}
      </div>
    </div>
  )
}

// --- Main Component ---
export function SeeItWorkSection() {
  // THE TEXT COLUMN (RIGHT SIDE)
  const textColumn = (
    <div className='flex flex-col gap-6 md:gap-8 lg:sticky lg:top-24'>
      <SectionLabel>02 / See It Work</SectionLabel>

      <Heading level={2} className='font-serif text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight'>
        A founder is deciding whether to expand internationally.
      </Heading>

      <Text as='p' className='text-muted-foreground leading-relaxed text-base md:text-lg'>
        Most AI tools will simply answer the question you ask. Vāda interrogates the premise.
        <br />
        <br />
        Watch how a standard business dilemma is broken down by four distinct cognitive models. Through orthogonal
        analysis and adversarial friction, the initial binary choice is destroyed and synthesized into a superior
        strategic pivot.
      </Text>

      <blockquote className='border-l-4 border-foreground bg-muted/20 px-5 py-4 mt-2'>
        <Text as='p' className='text-base text-foreground leading-relaxed'>
          The question she walked in with has been replaced by a better question.{' '}
          <span className='font-bold'>That reframe is the product.</span>
        </Text>
      </blockquote>
    </div>
  )

  // THE DIAGRAM COLUMN (LEFT SIDE)
  const diagramColumn = (
    <div className='relative w-full p-4 sm:p-6 border border-border bg-background/80'>
      {/* Blueprint Grid Mask Layer */}
      <div
        className='absolute inset-0 pointer-events-none z-0 opacity-40'
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: '-1px -1px',
          maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 90%)'
        }}
      />

      <div className='relative z-10'>
        {/* Blueprint Header */}
        <div className='flex items-baseline justify-between mb-6 hidden sm:flex'>
          <div className='font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground'>
            Schema — Sealed Debate Session
          </div>
          <div className='font-serif text-sm font-medium text-foreground italic'>Vāda</div>
        </div>

        {/* Input Query */}
        <div className='relative border-[1.5px] border-foreground bg-background p-4 sm:p-5 mb-1'>
          <div className='absolute -top-[9px] left-3 bg-background px-2 font-mono text-[8px] tracking-[0.18em] text-muted-foreground uppercase font-medium'>
            Input_Query
          </div>
          <div className='font-serif italic text-lg text-foreground tracking-tight'>
            "Should we expand to Europe this year or consolidate the US market first?"
          </div>
        </div>

        <DownArrow />

        {/* Rounds */}
        <RoundArena title='Round 1' subtitle='Orthogonal' agents={ROUND_1_AGENTS} roundKey='siw-r1' />
        <DownArrow />
        <RoundArena title='Round 2' subtitle='Adversarial' agents={ROUND_2_AGENTS} roundKey='siw-r2' />
        <DownArrow />

        {/* Round 3: Convergence */}
        <div className='relative border-[1.5px] border-foreground bg-background p-5 mb-1'>
          <div className='absolute -top-[9px] left-3 bg-background px-2 font-mono text-[8px] tracking-[0.18em] font-medium text-foreground uppercase'>
            Round 3 · Convergence
          </div>
          <div className='font-serif italic text-lg text-foreground tracking-tight leading-snug'>
            "The question has evolved from 'expand or not' to 'is there a viable partner?'"
          </div>
        </div>

        <DownArrow />

        {/* Conclusion */}
        <div className='relative border-[1.5px] border-foreground bg-muted/30 p-5'>
          <div className='absolute -top-[9px] left-3 bg-background px-2 font-mono text-[8px] tracking-[0.18em] font-medium text-foreground uppercase'>
            Conclusion
          </div>
          <div className='absolute -top-[9px] right-3 bg-background px-2 font-mono text-[8px] tracking-[0.14em] text-success border border-success uppercase'>
            Clean
          </div>

          <ul className='mt-1 space-y-2.5'>
            {CONCLUSION_FIELDS.map((field, i) => {
              const statusColors = ['var(--success)', 'var(--warning)', 'var(--destructive)']
              return (
                <li
                  key={field.label}
                  className='flex items-baseline gap-2.5 text-[12px] sm:text-[13px] text-foreground/80'
                >
                  <span
                    className='w-[5px] h-[5px] rounded-full shrink-0 translate-y-[-1px]'
                    style={{ backgroundColor: statusColors[i] || 'var(--muted-foreground)' }}
                  />
                  <span>
                    <strong className='font-semibold text-foreground'>{field.label}:</strong> {field.value}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )

  return (
    <SectionWrapper id='see-it-work'>
      <TwoColumnSection className='md:grid-cols-[1.2fr_1fr] md:items-start' left={diagramColumn} right={textColumn} />
    </SectionWrapper>
  )
}
