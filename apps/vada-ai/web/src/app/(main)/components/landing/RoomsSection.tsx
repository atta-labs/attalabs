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

// a card and its link share the grid's six rows from WIDE (1000px)
const SUBGRID = 'min-[1000px]:row-span-6 min-[1000px]:grid min-[1000px]:grid-rows-subgrid'

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
      {/* Three columns from WIDE: every card is a subgrid over the same six rows (number, name,
          rule, line, agents, link), so each row lines up across the cards whatever wraps. Below
          WIDE the cards stack, each only as tall as its content. Spacing lives on the rows. */}
      <div ref={row} className={cn(HEADER_MARGIN, 'grid gap-4 min-[1000px]:grid-cols-3 min-[1000px]:gap-y-0')}>
        {ROOMS.map((room, index) => (
          <NextLink
            key={room.name}
            href={`/teams/${room.slug}`}
            variant='unstyled'
            className={cn('group/room block', SUBGRID)}
          >
            <Card
              className={cn(
                'flex flex-col gap-0 px-5 py-5 xl:px-8 xl:py-6',
                SUBGRID,
                'transition-[opacity,transform,border-color] duration-700 group-hover/room:border-primary ease-out motion-reduce:transition-none',
                DELAYS[index],
                seen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.96] opacity-0'
              )}
            >
              <CardHeader className='contents'>
                <Text className='font-mono text-sm uppercase tracking-[0.06em] opacity-80 xl:text-base'>{`0${index + 1}`}</Text>
                <CardTitle className='mt-1 font-sans text-2xl font-normal leading-[1.15] tracking-[-0.02em] xl:mt-2 xl:text-[1.875rem]'>
                  <WipeReveal delayClass={TITLE_DELAYS[index]}>{room.name}</WipeReveal>
                </CardTitle>
                {/* the rule draws in under the name, as on Vinaya's audience cards */}
                <span
                  aria-hidden='true'
                  className={cn(
                    'mt-4 block h-0.5 origin-left self-start w-full bg-current opacity-25 transition-transform duration-700 ease-out motion-reduce:transition-none',
                    RULE_DELAYS[index],
                    seen ? 'scale-x-100' : 'scale-x-0'
                  )}
                />
              </CardHeader>
              <CardContent className='contents'>
                <Text
                  className={cn(
                    'mt-4 text-base leading-[1.5] transition-opacity duration-700 motion-reduce:transition-none xl:mt-5 xl:text-lg',
                    LINE_DELAYS[index],
                    seen ? 'opacity-80' : 'opacity-0'
                  )}
                >
                  {room.line}
                </Text>
                {/* a row of four spheres is wider than a card between WIDE and xl: the row is zoomed
                    down there (spacing included), never overlapped or wrapped */}
                <div className='mt-4 flex flex-nowrap items-center gap-2 max-xl:min-[1000px]:[zoom:0.82] xl:mt-5'>
                  {room.agents}
                </div>
                <span className='mt-4 inline-flex items-center gap-2 font-mono text-sm uppercase tracking-[0.06em] text-muted-foreground transition-colors group-hover/room:text-primary xl:mt-5'>
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
