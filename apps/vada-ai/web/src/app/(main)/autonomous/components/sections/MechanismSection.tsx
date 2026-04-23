'use client'

import { Heading, Text } from '@atta/ui'
import { AIAgent, type AgentName, AGENT_COLOR_BY_ROLE } from '@atta/ui/canvas'
import { SectionLabel } from '../primitives/SectionLabel'
import { SectionWrapper } from '../primitives/SectionWrapper'
import { TwoColumnSection } from '../primitives/TwoColumnSection'
import { BYOKCallout } from './mechanism/BYOKCallout'
import type { AgentCardData } from '../primitives/AgentCard'

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

// --- SVG Helpers for the Network Topology ---
function OrthogonalGeometry() {
  return (
    <svg viewBox='0 0 180 140' className='w-full'>
      <circle cx='50' cy='40' r='9' fill={AGENT_COLOR_BY_ROLE.strategist} />
      <circle cx='130' cy='40' r='9' fill={AGENT_COLOR_BY_ROLE.critic} />
      <circle cx='50' cy='110' r='9' fill={AGENT_COLOR_BY_ROLE.synthesizer} />
      <circle cx='130' cy='110' r='9' fill={AGENT_COLOR_BY_ROLE.devils_advocate} />
    </svg>
  )
}

function AdversarialGeometry() {
  return (
    <svg viewBox='0 0 180 140' className='w-full text-border'>
      <line x1='50' y1='40' x2='130' y2='110' stroke='currentColor' strokeWidth='1.5' />
      <line x1='130' y1='40' x2='50' y2='110' stroke='currentColor' strokeWidth='1.5' />
      <line x1='50' y1='40' x2='130' y2='40' stroke='currentColor' strokeWidth='1.5' />
      <line x1='50' y1='110' x2='130' y2='110' stroke='currentColor' strokeWidth='1.5' />
      <line x1='50' y1='40' x2='50' y2='110' stroke='currentColor' strokeWidth='1.5' />
      <line x1='130' y1='40' x2='130' y2='110' stroke='currentColor' strokeWidth='1.5' />

      <circle cx='50' cy='40' r='9' fill={AGENT_COLOR_BY_ROLE.strategist} />
      <circle cx='130' cy='40' r='9' fill={AGENT_COLOR_BY_ROLE.critic} />
      <circle cx='50' cy='110' r='9' fill={AGENT_COLOR_BY_ROLE.synthesizer} />
      <circle cx='130' cy='110' r='9' fill={AGENT_COLOR_BY_ROLE.devils_advocate} />
    </svg>
  )
}

function ConvergenceGeometry() {
  return (
    <svg viewBox='0 0 180 140' className='w-full text-border'>
      <line x1='50' y1='40' x2='90' y2='75' stroke='currentColor' strokeWidth='1.5' />
      <line x1='130' y1='40' x2='90' y2='75' stroke='currentColor' strokeWidth='1.5' />
      <line x1='50' y1='110' x2='90' y2='75' stroke='currentColor' strokeWidth='1.5' />
      <line x1='130' y1='110' x2='90' y2='75' stroke='currentColor' strokeWidth='1.5' />

      {/* Central "Resolved" Node */}
      <circle cx='90' cy='75' r='10' fill='none' stroke='hsl(var(--foreground))' strokeWidth='1.5' />
      <line x1='85' y1='70' x2='95' y2='80' stroke='hsl(var(--foreground))' strokeWidth='1' />
      <line x1='95' y1='70' x2='85' y2='80' stroke='hsl(var(--foreground))' strokeWidth='1' />

      <circle cx='50' cy='40' r='9' fill={AGENT_COLOR_BY_ROLE.strategist} />
      <circle cx='130' cy='40' r='9' fill={AGENT_COLOR_BY_ROLE.critic} />
      <circle cx='50' cy='110' r='9' fill={AGENT_COLOR_BY_ROLE.synthesizer} />
      <circle cx='130' cy='110' r='9' fill={AGENT_COLOR_BY_ROLE.devils_advocate} />
    </svg>
  )
}

export function MechanismSection() {
  // THE TEXT COLUMN (LEFT SIDE)
  const textColumn = (
    <div className='flex flex-col gap-10 md:gap-14 lg:sticky lg:top-24'>
      <div className='flex flex-col gap-6 md:gap-8'>
        <SectionLabel>03 / The Mechanism</SectionLabel>

        <Heading level={2} className='font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight'>
          <span className='block'>Four agents. Three rounds.</span>
          <span className='block text-muted-foreground'>One conclusion.</span>
        </Heading>

        <Text as='p' className='text-muted-foreground leading-relaxed text-base md:text-lg'>
          The geometry of the room forces extreme scrutiny. The Strategist builds, the Critic tears down, the Devil's
          Advocate rejects the entire premise, and the Synthesizer hunts for the signal in the noise.
        </Text>

        <blockquote className='border-l-4 border-foreground bg-muted/20 px-5 py-4 mt-2'>
          <Text as='p' className='text-base text-foreground leading-relaxed italic'>
            "Most AI products hide their uncertainty. <span className='font-bold not-italic'>Vāda names it.</span>"
          </Text>
        </blockquote>
      </div>

      <BYOKCallout />
    </div>
  )

  // THE DIAGRAM COLUMN (RIGHT SIDE)
  const diagramColumn = (
    <div className='relative w-full p-4 sm:p-6 lg:p-8 border border-border bg-background/80'>
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
          maskImage: 'radial-gradient(ellipse at center, black 15%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 15%, transparent 85%)'
        }}
      />

      <div className='relative z-10'>
        {/* Blueprint Header */}
        <div className='flex items-baseline justify-between mb-10 hidden sm:flex'>
          <div className='font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground'>
            Schema-03 · The Mechanism
          </div>
          <div className='font-serif text-sm font-medium text-foreground italic'>Vāda</div>
        </div>

        {/* The Agent Ring */}
        <div className='flex flex-wrap justify-center gap-6 sm:gap-10 mb-10'>
          {MECHANISM_AGENTS.map((agent) => {
            const agentNameMap: Record<string, AgentName> = {
              strategist: 'Strategist',
              critic: 'Critic',
              devils_advocate: "Devil's Advocate",
              synthesizer: 'Synthesizer'
            }
            const agentName = agentNameMap[agent.agent] || (agent.agent as AgentName)
            return (
              <div key={agent.agent} className='flex flex-col items-center gap-3 w-20'>
                <AIAgent
                  id={`mechanism-${agent.agent}`}
                  name={agentName}
                  size='sm'
                  state='speaking'
                  showMatrix={true}
                  particleCount={30}
                />
                <div className='text-center'>
                  <div className='text-[10px] sm:text-[11px] text-muted-foreground leading-tight'>{agent.role}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* The Rounds */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6'>
          <div className='border-[1.5px] border-foreground bg-background'>
            <div className='flex justify-between items-center border-b border-border px-3 py-2'>
              <span className='font-mono text-[9px] tracking-[0.2em] uppercase font-medium'>Round 1</span>
              <span className='font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase'>Orthogonal</span>
            </div>
            <div className='p-4 flex justify-center'>
              <OrthogonalGeometry />
            </div>
          </div>

          <div className='border-[1.5px] border-foreground bg-background'>
            <div className='flex justify-between items-center border-b border-border px-3 py-2'>
              <span className='font-mono text-[9px] tracking-[0.2em] uppercase font-medium'>Round 2</span>
              <span className='font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase'>
                Adversarial
              </span>
            </div>
            <div className='p-4 flex justify-center'>
              <AdversarialGeometry />
            </div>
          </div>

          <div className='border-[1.5px] border-foreground bg-background'>
            <div className='flex justify-between items-center border-b border-border px-3 py-2'>
              <span className='font-mono text-[9px] tracking-[0.2em] uppercase font-medium'>Round 3</span>
              <span className='font-mono text-[9px] tracking-[0.14em] text-muted-foreground uppercase'>
                Convergence
              </span>
            </div>
            <div className='p-4 flex justify-center'>
              <ConvergenceGeometry />
            </div>
          </div>
        </div>

        <div className='text-center font-serif italic text-sm text-muted-foreground mb-8'>
          The language between rounds is never compressed. The specific words are the data.
        </div>

        {/* The Pipeline */}
        <div className='border-[1.5px] border-foreground bg-background grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch'>
          <div className='p-4 flex flex-col justify-center'>
            <div className='font-mono text-[9px] tracking-[0.14em] font-bold uppercase mb-2 flex items-center gap-2'>
              Conclusion
              <span className='font-normal border border-success text-success px-1.5 py-0.5 tracking-[0.1em] rounded-sm'>
                CLEAN
              </span>
            </div>
            <ul className='space-y-1 text-[11px] text-muted-foreground'>
              <li className='flex items-center gap-2'>
                <span className='text-[6px]'>■</span> Recommendation
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-[6px]'>■</span> Key condition
              </li>
              <li className='flex items-center gap-2'>
                <span className='text-[6px]'>■</span> Unresolved
              </li>
            </ul>
          </div>

          <div className='hidden lg:flex items-center justify-center border-x border-border px-3 text-muted-foreground font-mono'>
            →
          </div>
          <div className='flex lg:hidden items-center justify-center py-1 text-muted-foreground font-mono'>↓</div>

          <div className='p-4 flex flex-col items-center justify-center text-center border-y lg:border-y-0 border-border'>
            <div className='text-lg text-foreground mb-1'>⊘</div>
            <div className='font-mono text-[9px] tracking-[0.16em] font-bold uppercase text-foreground mb-1'>
              Blind Critic
            </div>
            <div className='font-serif italic text-[11px] text-muted-foreground leading-tight'>
              Sees only the initial question and the final conclusion.
            </div>
          </div>

          <div className='hidden lg:flex items-center justify-center border-x border-border px-3 text-muted-foreground font-mono'>
            →
          </div>
          <div className='flex lg:hidden items-center justify-center py-1 text-muted-foreground font-mono'>↓</div>

          <div className='p-4 flex flex-col justify-center gap-2'>
            <div className='pl-2 border-l-[3px] border-success'>
              <div className='font-mono text-[8px] tracking-[0.14em] font-bold uppercase text-success'>Clean</div>
              <div className='text-[10px] text-muted-foreground'>Passed on first review.</div>
            </div>
            <div className='pl-2 border-l-[3px] border-warning'>
              <div className='font-mono text-[8px] tracking-[0.14em] font-bold uppercase text-warning'>Revised</div>
              <div className='text-[10px] text-muted-foreground'>Caught a problem, fixed it.</div>
            </div>
            <div className='pl-2 border-l-[3px] border-destructive'>
              <div className='font-mono text-[8px] tracking-[0.14em] font-bold uppercase text-destructive'>
                Unconverged
              </div>
              <div className='text-[10px] text-muted-foreground'>Honest signal, not failure.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <SectionWrapper id='mechanism'>
      <TwoColumnSection className='md:grid-cols-[1fr_1.2fr] md:items-start' left={textColumn} right={diagramColumn} />
    </SectionWrapper>
  )
}
