'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import type { AgentRole } from '@/components/agents/VadaAgent'
import { useSeen } from './LandingInteractions'
import { LandingSection } from './LandingSection'
import { ReviewerAgent, RoleAgent } from './ReviewerAgent'
import { REVIEWERS } from './reviewers'
import { HEADER_MARGIN, SectionHeader, SectionSubtitle, SectionTitle } from './SectionHeading'
import { UnderlineLink } from './UnderlineLink'
import { WipeReveal } from './WipeReveal'

// 02 · Pick your room. A landing beat, not a spec sheet: three cards after Vinaya's "Who it's for"
// (`AudienceSection.tsx`), one per published team — its name, one line, its agents. Once the row is
// in view each card rises, then its name wipes in, a rule draws under it and the line fades in.
// Each card is a link to that team's page, with a hover state and an "Explore team" cue. Details live on `/teams`.

const KEYS_STRIP = 'Bring your own keys · Choose every model slot · Mix vendors'

// Outside Read's attack-vector panel, as `vada-fusion-native.yaml` defines it
const PANEL: readonly { name: string; role: AgentRole; model: string }[] = [
  { name: 'AssumptionHunter', role: 'devils_advocate', model: 'claude-sonnet-4-6' },
  { name: 'BaseRate', role: 'researcher', model: 'gemini-2.5-pro' },
  { name: 'FailureMode', role: 'critic', model: 'gpt-4o' },
  { name: 'SecondOrder', role: 'strategist', model: 'grok-3' }
]

function Reviewers({ prefix }: { prefix: string }) {
  return REVIEWERS.slice(0, 3).map((r) => (
    <ReviewerAgent tight key={r.vendor} id={`${prefix}-${r.vendor}`} vendor={r.vendor} model={r.model} />
  ))
}

const ROOMS = [
  {
    name: 'Reviewers',
    slug: 'vada-reviewers',
    line: 'Three models, side by side.',
    agents: <Reviewers prefix='landing-room-a' />
  },
  {
    name: 'Reviewers + Synthesis',
    slug: 'vada-reviewers-synthesis',
    line: 'Their consensus and conflicts, structured.',
    agents: (
      <>
        <Reviewers prefix='landing-room-b' />
        <RoleAgent tight id='landing-room-b-synthesizer' name='Synthesizer' role='synthesizer' />
      </>
    )
  },
  {
    name: 'Outside Read',
    slug: 'vada-fusion-native',
    line: 'A battlefield map, audited before delivery.',
    agents: PANEL.map((agent) => (
      <RoleAgent
        tight
        key={agent.name}
        id={`landing-room-c-${agent.name}`}
        name={agent.name}
        role={agent.role}
        model={agent.model}
      />
    ))
  }
] as const

const DELAYS = ['delay-0', 'delay-[140ms]', 'delay-[280ms]'] as const
// per card, after it has risen: the name wipes, the rule draws, the line fades in
const TITLE_DELAYS = ['delay-[300ms]', 'delay-[440ms]', 'delay-[580ms]'] as const
const RULE_DELAYS = ['delay-[700ms]', 'delay-[840ms]', 'delay-[980ms]'] as const
const LINE_DELAYS = ['delay-[900ms]', 'delay-[1040ms]', 'delay-[1180ms]'] as const

export function RoomsSection() {
  const row = useRef<HTMLDivElement>(null)
  // starts late: the cards rise once their row's top is past the middle of the screen, in view
  const seen = useSeen(row, 0.55)

  return (
    <LandingSection id='teams' background='bg-background text-foreground' py='spacious'>
      <SectionHeader>
        <SectionTitle size='compact'>Pick your room.</SectionTitle>
        <SectionSubtitle className='text-muted-foreground'>
          <WipeReveal late>{KEYS_STRIP}</WipeReveal>
        </SectionSubtitle>
      </SectionHeader>
      <div ref={row} className={cn(HEADER_MARGIN, 'grid gap-4 xl:grid-cols-3')}>
        {ROOMS.map((room, index) => (
          <NextLink key={room.name} href={`/teams/${room.slug}`} variant='unstyled' className='group/room block h-full'>
            <Card
              className={cn(
                'flex h-full flex-col transition-[opacity,transform,border-color] duration-700 group-hover/room:border-primary ease-out motion-reduce:transition-none',
                DELAYS[index],
                seen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.96] opacity-0'
              )}
            >
              <CardHeader className='px-8'>
                <Text className='font-mono text-base uppercase tracking-[0.06em] opacity-80'>{`0${index + 1}`}</Text>
                <CardTitle className='mt-2 min-h-[2.3em] font-sans text-[1.875rem] font-normal leading-[1.15] tracking-[-0.02em]'>
                  <WipeReveal delayClass={TITLE_DELAYS[index]}>{room.name}</WipeReveal>
                </CardTitle>
                {/* the rule draws in under the name, as on Vinaya's audience cards */}
                <span
                  aria-hidden='true'
                  className={cn(
                    'mt-4 block h-0.5 origin-left bg-current opacity-25 transition-transform duration-700 ease-out motion-reduce:transition-none',
                    RULE_DELAYS[index],
                    seen ? 'scale-x-100' : 'scale-x-0'
                  )}
                />
              </CardHeader>
              <CardContent className='flex flex-1 flex-col gap-5 px-8'>
                <Text
                  className={cn(
                    'min-h-[3em] text-lg leading-[1.5] transition-opacity duration-700 motion-reduce:transition-none',
                    LINE_DELAYS[index],
                    seen ? 'opacity-80' : 'opacity-0'
                  )}
                >
                  {room.line}
                </Text>
                <div className='mt-auto flex flex-nowrap items-center gap-1'>{room.agents}</div>
                <span className='inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.06em] text-muted-foreground transition-colors group-hover/room:text-primary'>
                  Explore team
                  <ArrowRight className='size-3.5 transition-transform group-hover/room:translate-x-1' />
                </span>
              </CardContent>
            </Card>
          </NextLink>
        ))}
      </div>
      <div className='mt-10 flex justify-center'>
        <UnderlineLink href='/teams'>See all the teams</UnderlineLink>
      </div>
    </LandingSection>
  )
}
