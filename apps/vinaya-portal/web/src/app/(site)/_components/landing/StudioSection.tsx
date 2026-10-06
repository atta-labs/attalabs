'use client'

import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { Flag, Terminal } from 'lucide-react'
import { useRef } from 'react'
import { useNarrow, usePinProgress, useViewportHeight } from './LandingInteractions'
import { SectionTitle } from './SectionHeading'
import { UnderlineLink } from './UnderlineLink'

// 05 · Studio. 420vh runway, one sticky stage: scroll walks three views of the Studio window
// (milestones, tasks, the dev-review loop monitor) while the left column names the active one.
// Under reduced motion the runway collapses and the final view (the loop monitor, complete) shows.

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

type LogMark = '›' | '✓' | '✕' | '☞'
const LOG: readonly { time: string; mark: LogMark; text: string }[] = [
  { time: '11:02', mark: '›', text: 'Developer: round 1 done' },
  { time: '11:02', mark: '›', text: 'Reviewers dispatched in parallel' },
  { time: '11:03', mark: '✓', text: 'Security: pass' },
  { time: '11:03', mark: '✕', text: 'Code review: changes requested' },
  { time: '11:04', mark: '›', text: 'Round 2: developer addressing the findings' },
  { time: '11:06', mark: '✓', text: 'Code review: approved' },
  { time: '11:06', mark: '✓', text: 'Security: pass' },
  { time: '11:06', mark: '✓', text: 'Both approved, PR #893 up' },
  { time: '11:06', mark: '☞', text: 'Waiting for you to merge' }
]

const MARK_CLASS: Record<LogMark, string> = {
  '›': 'text-muted-foreground',
  '✓': 'text-success',
  '✕': 'text-destructive',
  '☞': 'text-background'
}

// Review-round boxes: `need` is the log line count at which each one resolves.
const ROUND_ONE = [
  { need: 1, mark: '✓', tone: 'bg-primary text-primary-foreground' },
  { need: 4, mark: '✕', tone: 'bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_var(--border)]' },
  { need: 3, mark: '✓', tone: 'bg-accent text-accent-foreground shadow-[inset_0_0_0_1px_var(--border)]' }
] as const
const ROUND_TWO = [
  { need: 5, mark: '✓', tone: 'bg-primary text-primary-foreground' },
  { need: 6, mark: '✓', tone: 'bg-secondary text-secondary-foreground shadow-[inset_0_0_0_1px_var(--border)]' },
  { need: 7, mark: '✓', tone: 'bg-accent text-accent-foreground shadow-[inset_0_0_0_1px_var(--border)]' }
] as const

const MONO_LABEL = 'font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted-foreground'
const PANEL_PAD = 'p-[clamp(0.9rem,2.5vh,1.4rem)]'

function CommandChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'items-center gap-[0.55rem] self-start rounded-lg border border-border bg-foreground px-[0.85rem] py-[0.55rem] font-mono text-[0.8125rem] text-background',
        className
      )}
    >
      <Terminal className='size-[15px] shrink-0 text-success' />
      <span>
        <span className='text-background/60'>$</span> vinaya studio
      </span>
    </span>
  )
}

function panelState(stage: number, index: number) {
  return cn(
    'absolute inset-0 transition-[opacity,transform] duration-[400ms] motion-reduce:transition-none',
    stage === index
      ? 'translate-y-0 opacity-100'
      : cn('pointer-events-none opacity-0', stage > index ? '-translate-y-[14px]' : 'translate-y-[14px]')
  )
}

function RoundBoxes({ boxes, n }: { boxes: typeof ROUND_ONE | typeof ROUND_TWO; n: number }) {
  const [lead, top, bottom] = boxes
  const box = (item: (typeof boxes)[number]) => {
    const done = n >= item.need
    const next = n === item.need - 1
    return (
      <span
        key={item.need}
        className={cn(
          'grid size-[1.4rem] place-items-center rounded-[3px] text-[0.72rem] transition-[opacity,transform] duration-300 motion-reduce:transition-none',
          item.tone,
          done ? 'scale-100 opacity-100' : cn('scale-90', next ? 'opacity-45' : 'opacity-[0.12]')
        )}
      >
        {done ? item.mark : next ? '…' : ''}
      </span>
    )
  }
  return (
    <div className='flex items-center justify-center gap-1'>
      {box(lead)}
      <div className='flex flex-col gap-0.5'>
        {box(top)}
        {box(bottom)}
      </div>
    </div>
  )
}

function LaneHeading({ children }: { children?: string }) {
  return <div className='flex justify-center'>{children ? <span className={MONO_LABEL}>{children}</span> : null}</div>
}

function RoundLabels() {
  return (
    <div className='flex justify-center'>
      <div className='flex gap-1'>
        {['dev', 'review'].map((label) => (
          <span
            key={label}
            className='flex w-[1.4rem] justify-center whitespace-nowrap font-mono text-[0.5rem] uppercase tracking-[0.06em] text-muted-foreground'
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function StudioMock({ sp, stage, viewport }: { sp: number; stage: number; viewport: number }) {
  const milestoneFill = clamp01((sp - 0.04) / 0.2)
  const taskFill = clamp01((sp - 0.3) / 0.18)
  const lines = Math.floor(clamp01((sp - 0.53) / 0.42) * 9.99)
  const cap = Math.max(3, Math.min(7, Math.floor((viewport - 430) / 19)))
  const status = lines >= 8 ? 'PUBLISHED · PR #893 · needs your merge' : lines >= 5 ? 'RUNNING · R2' : 'RUNNING · R1'

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background text-card-foreground shadow-lg'>
      <div className='flex items-center gap-4 border-b border-border px-[1.1rem] py-3 font-mono text-[0.6875rem]'>
        <span className='font-semibold tracking-[0.2em]'>VINAYA STUDIO</span>
        <span className='flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground'>
          atta-labs/attalabs · main
        </span>
        <span className='inline-flex items-center gap-[0.4rem] text-muted-foreground'>
          <i className='inline-block size-[7px] rounded-full bg-success' />
          live · 11:06
        </span>
      </div>
      <div className='relative min-h-[17rem] flex-1'>
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
                <span className='text-[0.95rem]'>{milestone.name}</span>
                <span className='font-mono text-[0.625rem] text-muted-foreground'>milestone</span>
              </div>
              <span className='font-mono text-[0.6875rem] text-muted-foreground'>{milestone.facts}</span>
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
            <span className='font-mono text-[0.625rem] uppercase tracking-[0.14em] text-success'>active</span>
          </div>
          <div className='grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-border bg-card px-[clamp(0.9rem,2.5vh,1.4rem)] py-[0.45rem] font-mono text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground'>
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
                className='grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-[clamp(0.9rem,2.5vh,1.4rem)] py-[clamp(0.4rem,1.2vh,0.6rem)] text-[0.95rem]'
              >
                <span className='font-mono text-[0.6875rem] text-muted-foreground'>{task.id}</span>
                <span className='overflow-hidden text-ellipsis whitespace-nowrap'>{task.title}</span>
                <span
                  className={cn(
                    'justify-self-end rounded-full border border-current px-2 py-[0.15rem] font-mono text-[0.625rem] transition-colors duration-300 motion-reduce:transition-none',
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

        <div
          aria-hidden={stage !== 2}
          className={cn(panelState(stage, 2), PANEL_PAD, 'flex flex-col gap-[clamp(0.6rem,1.8vh,1rem)]')}
        >
          <div className='grid grid-cols-[minmax(0,max-content)_repeat(3,max-content)] items-center justify-start gap-x-[clamp(1rem,2.5vw,1.75rem)] gap-y-[0.35rem]'>
            <span className={MONO_LABEL}>dev review loop monitor</span>
            <LaneHeading>r1</LaneHeading>
            <LaneHeading>r2</LaneHeading>
            <LaneHeading>pr</LaneHeading>
            <div className='row-span-2 flex min-w-0 flex-col gap-[0.2rem] self-center'>
              <span className='overflow-hidden text-ellipsis whitespace-nowrap text-[0.95rem]'>Custom events</span>
              <span className='font-mono text-[0.6875rem] text-muted-foreground'>#893 · Mac · opus</span>
            </div>
            <RoundLabels />
            <RoundLabels />
            <span />
            <RoundBoxes boxes={ROUND_ONE} n={lines} />
            <RoundBoxes boxes={ROUND_TWO} n={lines} />
            <div className='flex justify-center'>
              <span
                className={cn(
                  'grid size-[1.4rem] place-items-center rounded-[3px] border border-dashed border-success text-success transition-opacity duration-300 motion-reduce:transition-none',
                  lines >= 8 ? 'opacity-100' : lines === 7 ? 'opacity-45' : 'opacity-[0.12]'
                )}
              >
                <Flag className='size-[11px]' />
              </span>
            </div>
          </div>
          <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-foreground text-background'>
            <div
              className={cn(
                'border-b border-border bg-background px-[0.9rem] py-[0.55rem] font-mono text-[0.6875rem] tracking-[0.08em] transition-colors duration-300 motion-reduce:transition-none',
                lines >= 8 ? 'text-success' : 'text-foreground'
              )}
            >
              {status}
            </div>
            <div className='flex min-h-0 flex-1 flex-col justify-end overflow-hidden px-[0.9rem] py-[0.6rem] font-mono text-[0.6875rem] leading-[1.7]'>
              {LOG.map((line, index) => {
                const on = lines > index && index >= lines - cap
                return (
                  <div
                    key={`${line.time}-${line.text}`}
                    className={cn(
                      'grid-cols-[3.2em_1.3em_minmax(0,1fr)] transition-opacity duration-300 motion-reduce:transition-none',
                      on ? 'grid opacity-100' : 'hidden opacity-0'
                    )}
                  >
                    <span className='text-background/60'>{line.time}</span>
                    <span className={MARK_CLASS[line.mark]}>{line.mark}</span>
                    <span className={line.mark === '☞' ? 'font-semibold' : undefined}>{line.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StudioSection() {
  const ref = useRef<HTMLElement>(null)
  const sp = usePinProgress(ref)
  const narrow = useNarrow()
  const viewport = useViewportHeight()
  const stage = sp < 0.28 ? 0 : sp < 0.5 ? 1 : 2

  return (
    <section ref={ref} className='relative h-[420vh] bg-card text-card-foreground motion-reduce:h-auto'>
      <div className='sticky top-0 box-border flex h-screen items-center overflow-hidden motion-reduce:h-auto motion-reduce:min-h-screen'>
        <div className='mx-auto flex w-full max-w-[73.75rem] flex-wrap items-stretch gap-[clamp(1.5rem,3.5vw,3.5rem)] px-6 pb-[clamp(1rem,4vh,4rem)] pt-[calc(3.5rem+clamp(0.5rem,2vh,2rem))] sm:px-10'>
          <div className='flex min-w-0 flex-[1_1_14rem] flex-col gap-[clamp(0.6rem,2vh,1.25rem)]'>
            <SectionTitle size='compact' className='text-[clamp(2rem,3.2vw,2.75rem)]'>
              Your whole process, in one view
            </SectionTitle>
            {narrow ? null : (
              <>
                <CommandChip className='inline-flex' />
                <div className='flex flex-col gap-[clamp(0.5rem,1.6vh,1.1rem)]'>
                  {STEPS.map((step, index) => (
                    <div key={step.title} className='grid grid-cols-[2px_minmax(0,1fr)] gap-[0.9rem]'>
                      <span
                        className={cn(
                          'bg-foreground transition-opacity duration-300 motion-reduce:transition-none',
                          stage === index ? 'opacity-100' : 'opacity-15'
                        )}
                      />
                      <div
                        className={cn(
                          'flex flex-col gap-[0.2rem] transition-opacity duration-300 motion-reduce:transition-none',
                          stage === index ? 'opacity-100' : 'opacity-40'
                        )}
                      >
                        <span className='font-mono text-[0.625rem] uppercase tracking-[0.12em]'>
                          {`0${index + 1} · ${step.title}`}
                        </span>
                        <Text className='text-[0.95rem] leading-[1.45] text-muted-foreground'>{step.detail}</Text>
                      </div>
                    </div>
                  ))}
                </div>
                <div className='self-start'>
                  <UnderlineLink href='/the-studio'>Learn more about Studio</UnderlineLink>
                </div>
              </>
            )}
          </div>
          <div className='flex min-w-0 flex-[2_1_22rem] flex-col gap-[clamp(0.6rem,1.6vh,1rem)]'>
            <div className='grid'>
              {STEPS.map((step, index) => (
                <span
                  key={step.title}
                  className={cn(
                    '[grid-area:1/1] flex items-baseline gap-3 transition-[opacity,transform] duration-500 motion-reduce:transition-none',
                    stage === index
                      ? 'translate-y-0 opacity-100'
                      : cn('opacity-0', stage > index ? '-translate-y-[14px]' : 'translate-y-[14px]')
                  )}
                >
                  <span className='font-mono text-xs text-muted-foreground'>{`0${index + 1}`}</span>
                  <span className='text-[clamp(1.25rem,1.9vw,1.6rem)] tracking-[-0.02em]'>{step.title}</span>
                </span>
              ))}
            </div>
            <StudioMock sp={sp} stage={stage} viewport={viewport} />
          </div>
          {narrow ? (
            <div className='flex flex-none basis-full flex-row flex-wrap items-center gap-x-6 gap-y-4'>
              <CommandChip className='inline-flex' />
              <UnderlineLink href='/the-studio'>Learn more about Studio</UnderlineLink>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
