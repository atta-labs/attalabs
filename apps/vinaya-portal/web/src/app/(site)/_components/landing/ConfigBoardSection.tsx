'use client'

import { NextLink } from '@atta/ui/lib/next-link'
import { cn } from '@atta/ui/lib/utils'
import { ArrowUpRight, Bot, Clock, FileText, MessageSquare, Plus, Shield } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { siAnthropic, siGit, siGithub, siGithubactions, siOpenai } from 'simple-icons'
import { useEnterProgress } from './LandingInteractions'
import { LandingSection } from './LandingSection'
import { SectionTitle } from './SectionHeading'
import { UnderlineLink } from './UnderlineLink'

// 07 · One file. The config board: four slots (agents, checks, roles, gates), each a row of
// what ships with Vinaya (solid bars) and what is yours (dashed bars and dashed chips). Slots
// fill in sequence as the section scrolls into view (`q = floor(progress * 5)`).

// The dashed bars spring in one after another rather than all at once.
const BAR_DELAYS = ['delay-100', 'delay-[160ms]', 'delay-[220ms]'] as const
const CHIP_DELAYS = ['delay-200', 'delay-[310ms]', 'delay-[420ms]', 'delay-[530ms]'] as const

// Brand marks (Anthropic, OpenAI, Git, GitHub) have no lucide equivalent, so they come from simple-icons.
function BrandIcon({ path }: { path: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' className='size-[15px]'>
      <path d={path} />
    </svg>
  )
}

type Slot = {
  label: string
  solid: number
  dashed: number
  chips: readonly { title: string; icon: ReactNode; yours?: boolean }[]
}

const SLOTS: readonly Slot[] = [
  {
    label: 'AGENTS',
    solid: 4,
    dashed: 2,
    chips: [
      { title: 'Claude Code', icon: <BrandIcon path={siAnthropic.path} /> },
      { title: 'Codex', icon: <BrandIcon path={siOpenai.path} /> },
      { title: 'Grok', icon: <Bot className='size-[15px]' /> }
    ]
  },
  {
    label: 'CHECKS',
    solid: 3,
    dashed: 3,
    chips: [
      { title: 'brief-shape', icon: <FileText className='size-[15px]' /> },
      { title: 'review-gate', icon: <MessageSquare className='size-[15px]' /> },
      { title: 'secret-scan', icon: <Shield className='size-[15px]' /> },
      { title: 'yours', icon: <Plus className='size-[15px]' />, yours: true }
    ]
  },
  {
    label: 'ROLES',
    solid: 5,
    dashed: 1,
    chips: [
      { title: 'architect.md', icon: <FileBadge>MD</FileBadge> },
      { title: 'reviewer.md', icon: <FileBadge>MD</FileBadge> },
      { title: 'planner.md', icon: <FileBadge>MD</FileBadge> },
      { title: 'your-flow.js', icon: <FileBadge yours>JS</FileBadge>, yours: true }
    ]
  },
  {
    label: 'GATES',
    solid: 7,
    dashed: 2,
    chips: [
      { title: 'husky', icon: <BrandIcon path={siGit.path} /> },
      { title: 'Actions', icon: <BrandIcon path={siGithubactions.path} /> },
      { title: 'required', icon: <BrandIcon path={siGithub.path} /> },
      { title: 'audits', icon: <Clock className='size-[15px]' /> }
    ]
  }
]

function FileBadge({ children, yours }: { children: string; yours?: boolean }) {
  return (
    <b
      className={cn(
        'rounded-sm px-1 py-0.5 font-mono text-[0.6875rem] font-semibold',
        yours ? 'bg-foreground text-background' : 'bg-accent text-accent-foreground'
      )}
    >
      {children}
    </b>
  )
}

function SlotRow({ slot, on, last }: { slot: Slot; on: boolean; last: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-[clamp(0.5rem,1.2vw,1rem)] gap-y-3 border-t border-border py-6 sm:flex-nowrap',
        last && 'border-b'
      )}
    >
      <div className='flex min-w-0 flex-[1_1_auto] items-baseline whitespace-nowrap font-mono text-[clamp(1.125rem,1.7vw,1.5rem)] font-medium leading-none'>
        <span
          className={cn(
            'inline-block overflow-hidden whitespace-pre transition-[max-width,opacity] duration-500 motion-reduce:transition-none',
            on ? 'max-w-[6ch] opacity-100' : 'max-w-0 opacity-0'
          )}
        >
          {'YOUR '}
        </span>
        <span>{slot.label}</span>
      </div>
      <div
        className={cn(
          'flex flex-none gap-[0.3rem] overflow-hidden transition-[max-width] duration-500 ease-out motion-reduce:transition-none',
          on ? 'max-w-48' : 'max-w-0'
        )}
      >
        {slot.chips.map((chip, index) => (
          <span
            key={chip.title}
            title={chip.title}
            className={cn(
              'grid size-[1.9rem] flex-none place-items-center rounded-lg border bg-card transition-[opacity,transform] duration-[400ms] motion-reduce:transition-none',
              CHIP_DELAYS[index],
              chip.yours ? 'border-dashed border-foreground' : 'border-border',
              on ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-[6px] scale-[0.8] opacity-0'
            )}
          >
            {chip.icon}
          </span>
        ))}
      </div>
      <div className='flex flex-none items-center gap-[0.35rem]'>
        {Array.from({ length: slot.solid }, (_, index) => (
          <i key={`solid-${index}`} className='block h-6 w-2 rounded-sm bg-foreground' />
        ))}
        {Array.from({ length: slot.dashed }, (_, index) => (
          <i
            key={`dashed-${index}`}
            className={cn(
              'box-border block h-6 w-2 rounded-sm border-2 border-dashed border-foreground transition-[opacity,transform] duration-500 motion-reduce:transition-none',
              BAR_DELAYS[index],
              on ? 'translate-x-0 opacity-100' : '-translate-x-[10px] opacity-0'
            )}
          />
        ))}
      </div>
    </div>
  )
}

export function ConfigBoardSection() {
  const ref = useRef<HTMLElement>(null)
  const progress = useEnterProgress(ref, 0.85, 0.5)
  const filled = Math.min(4, Math.floor(progress * 5))

  return (
    <LandingSection
      ref={ref}
      background='bg-background text-foreground'
      py='spacious'
      className='flex flex-wrap items-center gap-16'
    >
      <div className='flex min-w-0 flex-[1_1_20rem] flex-col gap-2.5 text-center lg:gap-6 lg:text-left'>
        <SectionTitle size='compact'>
          Bring your own.
          <br />
          <span className='text-muted-foreground'>
            Agents, checks, gates.
            <br />
            One file.
          </span>
        </SectionTitle>
        <div className='mt-2 flex flex-col items-center gap-4 lg:items-start'>
          <NextLink
            href='/docs/config'
            variant='unstyled'
            className='rounded-lg bg-accent px-[0.65rem] py-[0.35rem] font-mono text-base font-bold text-accent-foreground'
          >
            vinaya.config.json
          </NextLink>
          <UnderlineLink href='/docs/config' icon={<ArrowUpRight className='size-3.5' />}>
            Configuration
          </UnderlineLink>
        </div>
      </div>
      <div className='flex min-w-0 flex-[1.2_1_24rem] flex-col'>
        {SLOTS.map((slot, index) => (
          <SlotRow key={slot.label} slot={slot} on={filled > index} last={index === SLOTS.length - 1} />
        ))}
        <div className='mt-5 flex justify-end gap-7 font-mono text-sm uppercase tracking-[0.02em] text-muted-foreground'>
          <span className='flex items-center gap-2'>
            <i className='block h-[0.6rem] w-5 rounded-sm bg-foreground' />
            ships with vinaya
          </span>
          <span className='flex items-center gap-2'>
            <i className='box-border block h-[0.6rem] w-5 rounded-sm border-2 border-dashed border-foreground' />
            yours
          </span>
        </div>
      </div>
    </LandingSection>
  )
}
