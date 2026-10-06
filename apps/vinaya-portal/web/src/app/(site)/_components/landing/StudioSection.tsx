'use client'

import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { useRef } from 'react'
import { useEnterProgress, useNarrow, usePinProgress, useReducedMotion } from './LandingInteractions'
import { HEADER_GAP, SectionHeader, SectionSubtitle, SectionTitle } from './SectionHeading'
import { LOOP_EVENT_COUNT, LoopMonitor } from './LoopMonitor'
import { UnderlineLink } from './UnderlineLink'

// 05 · Studio. 420vh runway, one sticky stage: scroll walks three views of the Studio window
// (milestones, tasks, the dev-review loop monitor) while the left column names the active one.
// It pins at every width, phones included: the views play as the reader scrolls and the stage holds
// still long enough to read each one. Under reduced motion it flows instead and the final view (the
// loop monitor, complete) shows.

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const STEPS = [
  { title: 'See where the project stands', detail: 'Every milestone, how far along it is' },
  { title: 'Follow every task', detail: 'Dispatched, in flight, merged, in order' },
  { title: 'Monitor the dev–review loop', detail: 'Every round, every verdict, live' }
] as const

const MILESTONES = [
  { name: 'checkout-v2', facts: '3 tranches · 1 active · 14 tasks', target: 64 },
  { name: 'log-portable-v1', facts: '2 tranches · 1 active · 9 tasks', target: 40 },
  { name: 'vada-production-v1', facts: '4 tranches · 0 active · 18 tasks', target: 50 }
] as const

const TASKS = [
  { id: '#889', title: 'Event schema versioning' },
  { id: '#891', title: 'Synchronous exit write' },
  { id: '#893', title: 'Custom events' },
  { id: '#895', title: 'Streaming parser' },
  { id: '#897', title: 'Custom events CLI' }
] as const

const MONO_LABEL = 'font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground'
// Side padding is the window header's (1.1rem), so everything inside the window lines up with it.
const PANEL_PAD = 'px-[1.1rem] py-[clamp(0.9rem,2.5vh,1.4rem)]'

function panelState(stage: number, index: number) {
  return cn(
    'absolute inset-0 transition-[opacity,transform] duration-[400ms] motion-reduce:transition-none',
    stage === index
      ? 'translate-y-0 opacity-100'
      : cn('pointer-events-none opacity-0', stage > index ? '-translate-y-[14px]' : 'translate-y-[14px]')
  )
}

function StudioMock({ sp, stage, pinned, narrow }: { sp: number; stage: number; pinned: boolean; narrow: boolean }) {
  const milestoneFill = clamp01((sp - 0.04) / 0.2)
  const taskFill = clamp01((sp - 0.3) / 0.18)
  const lines = Math.floor(clamp01((sp - 0.53) / 0.42) * (LOOP_EVENT_COUNT + 0.99))
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background text-card-foreground shadow-lg'>
      <div className='flex items-center gap-4 border-b border-border px-[1.1rem] py-3 font-mono text-[0.8125rem]'>
        <span className='whitespace-nowrap font-semibold tracking-[0.2em] max-[820px]:tracking-[0.1em]'>
          VINAYA STUDIO
        </span>
        <span className='flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
          atta-labs/attalabs · main
        </span>
        <span className='inline-flex items-center gap-[0.4rem] whitespace-nowrap text-muted-foreground'>
          <i className='inline-block size-[7px] rounded-full bg-success' />
          live · 11:06
        </span>
      </div>
      <div
        className={cn(
          'relative flex-1',
          pinned ? (narrow ? 'min-h-[clamp(17rem,38vh,26rem)]' : 'min-h-[clamp(17rem,48vh,26rem)]') : 'min-h-[24rem]'
        )}
      >
        <div
          aria-hidden={stage !== 0}
          className={cn(panelState(stage, 0), PANEL_PAD, 'flex flex-col gap-[clamp(0.4rem,1.4vh,0.8rem)]')}
        >
          <span className={MONO_LABEL}>milestones</span>
          {MILESTONES.map((milestone) => (
            <div
              key={milestone.name}
              className='flex min-h-0 flex-col justify-center gap-[clamp(0.15rem,0.6vh,0.35rem)] overflow-hidden rounded-lg border border-border bg-background px-[0.95rem] py-[clamp(0.35rem,1.2vh,0.65rem)]'
            >
              <div className='flex items-baseline justify-between gap-4'>
                <span className='text-lg'>{milestone.name}</span>
                <span className='font-mono text-xs text-muted-foreground'>milestone</span>
              </div>
              <span className='font-mono text-[0.8125rem] text-muted-foreground'>{milestone.facts}</span>
              <div className='h-[6px] overflow-hidden rounded-[3px] bg-border'>
                <div
                  className='h-full bg-success transition-[width] duration-500 ease-out motion-reduce:transition-none'
                  style={{ width: `${(milestone.target * milestoneFill).toFixed(1)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          aria-hidden={stage !== 1}
          className={cn(panelState(stage, 1), 'flex flex-col pt-[clamp(0.9rem,2.5vh,1.4rem)]')}
        >
          <div className='flex items-baseline justify-between gap-4 px-[clamp(0.9rem,2.5vh,1.4rem)] pb-[clamp(0.5rem,1.4vh,0.8rem)]'>
            <span className={MONO_LABEL}>tranche · log-portable-v1</span>
            <span className='font-mono text-xs uppercase tracking-[0.14em] text-success'>active</span>
          </div>
          <div className='grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-border bg-card px-[clamp(0.9rem,2.5vh,1.4rem)] py-[0.45rem] font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground'>
            <span>#</span>
            <span>task</span>
            <span>status</span>
          </div>
          {TASKS.map((task, index) => {
            const a = index * 0.17
            const b = a + 0.2
            const state = index === 4 ? 'queued' : taskFill >= b ? 'merged' : taskFill >= a ? 'in flight' : 'dispatched'
            return (
              <div
                key={task.id}
                className='grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-[clamp(0.9rem,2.5vh,1.4rem)] py-[clamp(0.4rem,1.2vh,0.6rem)] text-lg'
              >
                <span className='font-mono text-[0.8125rem] text-muted-foreground'>{task.id}</span>
                <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{task.title}</span>
                <span
                  className={cn(
                    'justify-self-end rounded-full border border-current px-2 py-[0.15rem] font-mono text-xs transition-colors duration-300 motion-reduce:transition-none',
                    state === 'merged'
                      ? 'text-success'
                      : state === 'in flight'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  )}
                >
                  {state}
                </span>
              </div>
            )
          })}
        </div>

        <div aria-hidden={stage !== 2} className={cn(panelState(stage, 2), PANEL_PAD, narrow && 'py-2', '@container')}>
          <LoopMonitor k={lines} />
        </div>
      </div>
    </div>
  )
}

export function StudioSection() {
  const ref = useRef<HTMLElement>(null)
  const pinned = !useReducedMotion()
  const pinProgress = usePinProgress(ref)
  const enterProgress = useEnterProgress(ref, 0.9, 0.9)
  const sp = pinned ? pinProgress : enterProgress
  const narrow = useNarrow()
  const stage = sp < 0.28 ? 0 : sp < 0.5 ? 1 : 2

  return (
    <section ref={ref} className={cn('relative bg-card text-card-foreground', pinned && 'h-[420vh]')}>
      <div
        className={cn(
          'box-border flex items-center',
          pinned ? 'sticky top-0 h-dvh overflow-hidden' : 'relative min-h-screen'
        )}
      >
        <div
          className={cn(
            'mx-auto flex w-full max-w-[73.75rem] flex-col px-6 sm:px-10',
            HEADER_GAP,
            pinned
              ? 'pb-[clamp(0.75rem,2vh,4rem)] pt-[calc(3.5rem+0.25rem)] min-[820px]:pt-[calc(3.5rem+clamp(0.5rem,2vh,2rem))]'
              : 'py-14'
          )}
        >
          <SectionHeader className='gap-2'>
            <SectionTitle size='compact'>Vinaya studio</SectionTitle>
            <SectionSubtitle>Your whole process, in one view</SectionSubtitle>
          </SectionHeader>
          <div className='flex flex-wrap items-stretch gap-x-[clamp(1.5rem,3.5vw,3.5rem)] gap-y-3'>
            {narrow ? null : (
              <div className='flex min-w-0 flex-[1_1_16rem] flex-col justify-between gap-6'>
                <div className='flex flex-1 flex-col justify-evenly gap-6'>
                  {STEPS.map((step, index) => (
                    <div key={step.title} className='grid grid-cols-[3px_minmax(0,1fr)] gap-[1.1rem]'>
                      <span
                        className={cn(
                          'bg-foreground transition-opacity duration-300 motion-reduce:transition-none',
                          stage === index ? 'opacity-100' : 'opacity-15'
                        )}
                      />
                      <div
                        className={cn(
                          'flex flex-col gap-2 py-1 transition-opacity duration-300 motion-reduce:transition-none',
                          stage === index ? 'opacity-100' : 'opacity-40'
                        )}
                      >
                        <span className='font-mono text-sm uppercase tracking-[0.06em] lg:text-base lg:tracking-[0.06em]'>
                          {`0${index + 1} · ${step.title}`}
                        </span>
                        <Text className='text-xl leading-[1.25] text-muted-foreground lg:text-2xl xl:[@media(min-height:840px)]:text-[1.75rem]'>
                          {step.detail}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
                <div className='self-start'>
                  <UnderlineLink href='/the-studio'>Learn more about Studio</UnderlineLink>
                </div>
              </div>
            )}
            <div className='flex min-w-0 flex-[2_1_22rem] flex-col gap-[clamp(0.6rem,1.6vh,1rem)]'>
              <StudioMock sp={sp} stage={stage} pinned={pinned} narrow={narrow} />
            </div>
          </div>
          {narrow ? (
            <div className='flex justify-center'>
              <UnderlineLink href='/the-studio'>Learn more about Studio</UnderlineLink>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
