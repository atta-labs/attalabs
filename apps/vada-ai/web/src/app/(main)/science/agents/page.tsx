'use client'

import { Heading, Text } from '@atta/ui/shared'
import { Separator } from '@atta/ui'
import { AIACanvas, AIASphere } from '@atta/ui/canvas'
import { AGENT_COLOR_BY_ROLE } from '@/lib/agent-theme'
import Link from 'next/link'
import { useId } from 'react'

const AGENTS = [
  {
    role: 'strategist',
    name: 'The Strategist',
    function: 'Maps the landscape, governs deliberation trajectory',
    role_desc:
      'Identifies the Grand Objective and ensures all sub-threads serve the terminal goal of resolving the core inquiry',
    voice: 'Measured, prescriptive, and teleological. Speaks in frameworks and milestones.'
  },
  {
    role: 'critic',
    name: 'The Critic',
    function: 'Analytical interrogation of premises and logical consistency',
    role_desc: 'Detects fallacies and demands empirical grounding for every assertion made in the room',
    voice: 'Sparse and clinical. Values brevity and precision, often responding with targeted, reductive questions.'
  },
  {
    role: 'devils_advocate',
    name: "The Devil's Advocate",
    function: 'Mandatory contrarian perspective generation',
    role_desc:
      'Prevents early consensus by identifying counter-arguments and unexplored failure modes in every position',
    voice: "Provocative and speculative. Uses 'What if' scenarios to dismantle comfortable assumptions."
  },
  {
    role: 'synthesizer',
    name: 'The Synthesizer',
    function: 'Reconciles contradictions between competing arguments',
    role_desc: 'Weaves disparate viewpoints into a cohesive, actionable narrative for the final conclusion',
    voice: 'Harmonious and narrative. Excels at summarizing progress and identifying convergence.'
  },
  {
    role: 'researcher',
    name: 'The Researcher',
    function: 'External knowledge validation and context grounding',
    role_desc: 'Supplies citations, historical precedents, and scientific literature to anchor claims in evidence',
    voice: 'Informative and dense. Speaks in bibliographies and case studies.'
  },
  {
    role: 'operator',
    name: 'The Operator',
    function: 'Translates theory into actionable, executable outputs',
    role_desc: 'Handles formatting, implementation clarity, and practical execution planning',
    voice: 'Functional and direct. Prioritizes utility over philosophy.'
  }
]

function AgentsScene() {
  const baseId = useId()

  return (
    <article className='space-y-16'>
      {/* Header */}
      <div className='space-y-4'>
        <span className='font-mono text-xs text-muted-foreground'>Agent Roster</span>
        <Heading level={1} className='font-serif text-4xl font-light leading-tight'>
          The Six Agents
        </Heading>
        <Text as='p' muted className='text-lg leading-relaxed'>
          Each agent is a distinct cognitive posture — not a role to be set aside, but a structural commitment
          maintained for the full duration of the deliberation.
        </Text>
      </div>

      <Separator className='opacity-20' />

      {/* Agent cards */}
      <div className='space-y-6'>
        {AGENTS.map((agent) => {
          const color = AGENT_COLOR_BY_ROLE[agent.role] ?? 'var(--foreground)'
          const sphereId = `${baseId}-agent-${agent.role}`
          return (
            <div key={agent.role} className='rounded-lg border border-border/20 bg-card/30 p-6 space-y-4'>
              {/* Name row with sphere */}
              <div className='flex items-center gap-4'>
                <AIASphere
                  id={sphereId}
                  size='md'
                  color={color}
                  state='speaking'
                  showMatrix
                  matrixOpacity={0.6}
                  label={agent.name}
                  labelPosition='right'
                />
              </div>

              <div className='grid gap-4 sm:grid-cols-3 pt-2'>
                <div className='space-y-1.5'>
                  <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                    Function
                  </Text>
                  <Text as='p' size='sm' className='leading-relaxed text-foreground/80'>
                    {agent.function}
                  </Text>
                </div>

                <div className='space-y-1.5'>
                  <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                    Role
                  </Text>
                  <Text as='p' size='sm' className='leading-relaxed text-foreground/80'>
                    {agent.role_desc}
                  </Text>
                </div>

                <div className='space-y-1.5'>
                  <Text as='p' className='font-mono text-[10px] uppercase tracking-widest text-muted-foreground'>
                    Voice
                  </Text>
                  <Text as='p' size='sm' className='font-serif italic leading-relaxed text-foreground/80'>
                    {agent.voice}
                  </Text>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Separator className='opacity-20' />

      {/* Navigation */}
      <div className='flex items-center justify-between pt-4'>
        <Link
          href='/science/frameworks'
          className='font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors'
        >
          ← Frameworks
        </Link>
        <Link
          href='/science/mechanics'
          className='font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline transition-colors'
        >
          Mechanics →
        </Link>
      </div>
    </article>
  )
}

export default function ScienceAgentsPage() {
  return (
    <AIACanvas alwaysRenderSpheres className='relative w-full'>
      <AgentsScene />
    </AIACanvas>
  )
}
