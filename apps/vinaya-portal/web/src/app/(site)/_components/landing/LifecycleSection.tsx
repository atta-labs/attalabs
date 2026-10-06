'use client'

import { Card, CardTitle } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { type ReactNode, useRef } from 'react'
import { LetterReveal } from '../LetterReveal'
import { usePinEnabled, usePinProgress, useSeen } from './LandingInteractions'
import { SectionHeader, SectionSubtitle, SectionTitle } from './SectionHeading'
import { UnderlineLink } from './UnderlineLink'

// 02 · The path. Pinned on a roomy viewport (230vh runway, sticky 100vh stage): scroll walks
// the active step Define → Plan → Dispatch. Anywhere else (narrow, short, reduced motion) the
// three cards flow, each sliding up as it enters.

const CHIP =
  'flex h-[1.45rem] items-center self-start whitespace-nowrap px-[0.55rem] font-mono text-[0.625rem] uppercase tracking-[0.02em] transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none'
const ARROW_CHIP = `${CHIP} pr-[1.2rem] [clip-path:polygon(0_0,100%_0,88%_50%,100%_100%,0_100%)]`
const HIDDEN = 'translate-x-[-10px] opacity-0'
const SHOWN = 'translate-x-0 opacity-100'

type Step = { number: string; title: string; role: string; body: string; Visual: (props: { on: boolean }) => ReactNode }

const MILESTONE_DELAYS = ['delay-0', 'delay-[180ms]', 'delay-[360ms]'] as const
const TASK_DELAYS = ['delay-0', 'delay-[220ms]', 'delay-[440ms]'] as const
const CARD_DELAYS = ['delay-0', 'delay-[140ms]', 'delay-[280ms]'] as const

function DefineVisual({ on }: { on: boolean }) {
  return (
    <div className='flex h-[5.25rem] flex-col justify-between'>
      {['milestone 1', 'milestone 2', 'milestone 3'].map((label, index) => (
        <span
          key={label}
          className={cn(
            ARROW_CHIP,
            MILESTONE_DELAYS[index],
            index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
            on ? SHOWN : HIDDEN
          )}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function PlanVisual({ on }: { on: boolean }) {
  return (
    <div className='flex h-[5.25rem] flex-col border border-border font-mono text-[0.625rem]'>
      <div className='border-b border-border px-[0.55rem] py-[0.3rem] uppercase tracking-[0.02em] text-muted-foreground'>
        milestone 1
      </div>
      {['#401', '#402', '#403'].map((task, index) => (
        <div
          key={task}
          className={cn(
            'flex flex-1 items-center gap-[0.6rem] px-[0.55rem] transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transition-none',
            TASK_DELAYS[index],
            on ? SHOWN : HIDDEN
          )}
        >
          <span>{task}</span>
          <span className='h-[3px] flex-1 bg-muted' />
        </div>
      ))}
    </div>
  )
}

function DispatchVisual({ on }: { on: boolean }) {
  const chip = cn(CHIP, 'rounded-sm duration-[400ms]', on ? SHOWN : HIDDEN)
  return (
    <div className='flex h-[5.25rem] flex-col justify-between'>
      <span className={cn(chip, 'bg-muted delay-0')}>task #401</span>
      <span className={cn(chip, 'border border-dashed border-foreground delay-500')}>dev ⇄ review</span>
      <span className={cn(chip, 'bg-success text-background delay-[1100ms]')}>✓ pull request</span>
    </div>
  )
}

const STEPS: readonly Step[] = [
  {
    number: '01',
    title: 'Define',
    role: 'you + architect',
    body: 'Define your features as milestones. As deep as you want.',
    Visual: DefineVisual
  },
  {
    number: '02',
    title: 'Plan',
    role: 'you + planner',
    body: 'Plan the tasks. Push back until the plan is yours.',
    Visual: PlanVisual
  },
  {
    number: '03',
    title: 'Dispatch',
    role: 'dev-review loop',
    body: 'Agents write and review the code. Each task ends in a pull request, ready for your approval.',
    Visual: DispatchVisual
  }
]

function StepCard({ index, step, pinned, active }: { index: number; step: Step; pinned: boolean; active: number }) {
  const slot = useRef<HTMLDivElement>(null)
  // Flowing layout: each card slides up the first time its top crosses 80% of the viewport.
  const entered = useSeen(slot, 0.8)
  const open = !pinned || index === active
  const visible = pinned ? index <= active : entered
  const { Visual } = step

  return (
    <div ref={slot} className='flex min-w-0 flex-1 basis-[calc((36rem_-_100%)_*_999)]'>
      <Card
        className={cn(
          'w-full min-w-0 gap-0 rounded-lg border bg-card px-6 py-5 text-card-foreground shadow-none',
          'transition-[border-color,opacity,transform] duration-700 ease-out motion-reduce:transition-none',
          CARD_DELAYS[index],
          open ? 'border-foreground' : 'border-border',
          pinned
            ? visible
              ? 'opacity-100'
              : 'opacity-35'
            : entered
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-12 scale-[0.96] opacity-0'
        )}
      >
        <div className='@container'>
          <div className='grid items-start gap-x-8 gap-y-3 @[560px]:grid-cols-2'>
            <div className='flex items-baseline gap-[0.9rem]'>
              <span className='font-mono text-[0.6875rem] tracking-[0.02em] text-muted-foreground'>{step.number}</span>
              <CardTitle className='font-serif text-2xl font-normal leading-[1.1] tracking-[-0.02em]'>
                {step.title}
              </CardTitle>
            </div>
            <div className='flex min-w-0 flex-col gap-[0.6rem]'>
              <span className='font-mono text-[0.625rem] uppercase tracking-[0.02em] text-muted-foreground'>
                {step.role}
              </span>
              <Text className='text-base leading-[1.45] text-pretty'>{step.body}</Text>
            </div>
            <div className='min-w-0 self-center font-mono text-[0.6875rem] @[560px]:col-start-2 @[560px]:row-span-2 @[560px]:row-start-1'>
              <Visual on={visible} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function LifecycleSection() {
  const ref = useRef<HTMLElement>(null)
  const pinned = usePinEnabled()
  const progress = usePinProgress(ref)
  const active = Math.min(2, Math.floor(progress * 3))

  return (
    <section id='tagline' ref={ref} className={cn('relative bg-background text-foreground', pinned && 'h-[230vh]')}>
      <div className={cn('flex items-center', pinned ? 'sticky top-0 min-h-screen' : 'relative')}>
        <div className='mx-auto flex w-full max-w-[73.75rem] flex-col gap-8 px-6 py-14 sm:px-10 lg:py-10'>
          <SectionHeader>
            <SectionTitle size='compact'>
              <LetterReveal text='Define. Plan. Dispatch.' />
            </SectionTitle>
            <SectionSubtitle>Milestones, tasks, then the loop.</SectionSubtitle>
          </SectionHeader>
          <div className='flex flex-wrap items-stretch gap-3'>
            {STEPS.map((step, index) => (
              <StepCard key={step.number} index={index} step={step} pinned={pinned} active={active} />
            ))}
          </div>
          <div className='flex justify-center'>
            <UnderlineLink href='/life-cycle'>See more at Vinaya’s life cycle</UnderlineLink>
          </div>
        </div>
      </div>
    </section>
  )
}
