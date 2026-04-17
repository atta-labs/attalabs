'use client'

import { Heading, Text } from '@atta/ui'
import { Compass, Gavel, Sparkles, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Agent {
  icon: LucideIcon
  name: string
  body: string
}

const AGENTS: Agent[] = [
  {
    icon: Compass,
    name: 'The Strategist',
    body: 'Orchestrates the logical flow and ensures the debate adheres to the primary objective. Focuses on pragmatic feasibility.'
  },
  {
    icon: Gavel,
    name: 'The Critic',
    body: 'Identifies logical fallacies and empirical inconsistencies. Operates on a high-temperature rejection threshold.'
  },
  {
    icon: Zap,
    name: "Devil's Advocate",
    body: 'Forced adversarial pressure. Tasked with constructing the strongest possible counter-argument regardless of consensus.'
  },
  {
    icon: Sparkles,
    name: 'The Synthesizer',
    body: 'The final arbiter. Reconciles the friction points between the three agents into a singular, high-integrity output.'
  }
]

export function ProtocolSection() {
  return (
    <section className='bg-background py-24 md:py-32'>
      <div className='mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-[1fr_1.2fr]'>
        <div className='flex flex-col gap-6'>
          <Text as='small' className='font-mono uppercase tracking-widest text-xs text-primary'>
            01 / Protocol
          </Text>
          <Heading level={2} className='font-serif text-4xl md:text-5xl text-foreground leading-tight'>
            Multi-Agent Deliberation
          </Heading>
          <Text as='p' className='text-muted-foreground max-w-md'>
            The default inference room instantiates four distinct intelligence personas, each governed by unique
            constraints and reward functions.
          </Text>
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          {AGENTS.map(({ icon: Icon, name, body }) => (
            <div key={name} className='flex flex-col gap-3'>
              <Icon className='h-5 w-5 text-primary' aria-hidden />
              <Text as='p' className='font-serif text-lg text-foreground'>
                {name}
              </Text>
              <Text as='p' className='text-sm text-muted-foreground'>
                {body}
              </Text>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
