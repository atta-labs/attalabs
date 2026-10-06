'use client'

import { Card, CardTitle } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { usePinEnabled, usePinProgress, useSeen } from './LandingInteractions'
import { HEADER_GAP, SectionHeader, SectionSubtitle, SectionTitle } from './SectionHeading'
import { UnderlineLink } from './UnderlineLink'

// 02 · The path. A centred title over three equal cards side by side; every card always shows its
// full text and visual. Pinned on a roomy viewport (300vh runway, sticky 100vh stage): scroll walks
// the active card Define → Plan → Dispatch, upcoming cards dimmed and each card's visual building in
// once it is active. Anywhere else (narrow, short, reduced motion) nothing pins and each card slides
// up as it enters.

const CHIP =
  'flex h-[1.9rem] items-center self-start whitespace-nowrap px-[0.7rem] font-mono text-[0.8125rem] uppercase tracking-[0.02em] transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none'
const ARROW_CHIP = `${CHIP} pr-[1.2rem] [clip-path:polygon(0_0,100%_0,88%_50%,100%_100%,0_100%)]`
const HIDDEN = 'translate-x-[-10px] opacity-0'
const SHOWN = 'translate-x-0 opacity-100'

type Step = {
  number: string
  title: string
  tag: string
  role: string
  body: string
  Visual: (props: { on: boolean; sub: number }) => ReactNode
}

const MILESTONE_DELAYS = ['delay-0', 'delay-[180ms]', 'delay-[360ms]'] as const
const TASK_DELAYS = ['delay-0', 'delay-[220ms]', 'delay-[440ms]'] as const
const CARD_DELAYS = ['delay-0', 'delay-[140ms]', 'delay-[280ms]'] as const

// The arrow notch is a clip-path, which a CSS border cannot follow, so an outlined milestone is two clipped
// layers: a border-coloured shape with the card-coloured shape inset by 1px inside it.
const ARROW_CLIP = '[clip-path:polygon(0_0,100%_0,88%_50%,100%_100%,0_100%)]'

function DefineVisual({ on }: { on: boolean }) {
  return (
    <div className='flex h-[clamp(5.5rem,15vh,7.5rem)] flex-col justify-between'>
      {['milestone 1', 'milestone 2', 'milestone 3'].map((label, index) =>
        index === 0 ? (
          <span
            key={label}
            className={cn(
              ARROW_CHIP,
              MILESTONE_DELAYS[index],
              'bg-primary text-primary-foreground',
              on ? SHOWN : HIDDEN
            )}
          >
            {label}
          </span>
        ) : (
          <span
            key={label}
            className={cn(
              'flex self-start bg-border p-px transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none',
              ARROW_CLIP,
              MILESTONE_DELAYS[index],
              on ? SHOWN : HIDDEN
            )}
          >
            <span
              className={cn(
                'flex h-[calc(1.9rem-2px)] items-center whitespace-nowrap bg-card px-[0.7rem] pr-[1.2rem] font-mono text-[0.8125rem] uppercase tracking-[0.02em] text-card-foreground',
                ARROW_CLIP
              )}
            >
              {label}
            </span>
          </span>
        )
      )}
    </div>
  )
}

function PlanVisual({ on }: { on: boolean }) {
  return (
    <div className='flex h-[clamp(5.5rem,15vh,7.5rem)] flex-col border border-border font-mono text-[0.8125rem]'>
      <div className='border-b border-border px-[0.7rem] py-[0.4rem] uppercase tracking-[0.02em] text-muted-foreground'>
        milestone 1
      </div>
      {['#401', '#402', '#403'].map((task, index) => (
        <div
          key={task}
          className={cn(
            'flex flex-1 items-center gap-[0.7rem] px-[0.7rem] transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transition-none',
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

// Dev and review as two outlined chips close together on one continuous loop. Scroll drives one lap:
// the ball rides the whole ring, out along the top to review and back along the bottom to dev, as `sub`
// (the card's own share of the pinned scroll, 0 to 1) advances; once it is home the pull request lands. The ball runs under the chips, so a label is never covered. The ring is drawn in a 184 x 50 box that is exactly 11.5rem wide, well taller
// than the chips so its top and bottom lines run clear of them, with the two fixed-width chips (4.5rem
// and 6rem, 1rem apart) centred on its two ends so the line connects them. Chips are outlined, not
// filled: the muted fill is nearly the card colour in dark mode.
const LAP_END = 0.85
const RING_PATH = 'M36 25V4H136V46H36Z'

function DispatchVisual({ on, sub }: { on: boolean; sub: number }) {
  const ring = useRef<SVGPathElement>(null)
  const [length, setLength] = useState(0)
  useEffect(() => setLength(ring.current?.getTotalLength() ?? 0), [])
  const lap = Math.min(1, sub / LAP_END)
  const done = on && sub >= LAP_END
  const ball = length > 0 && ring.current ? ring.current.getPointAtLength(lap * length) : { x: 36, y: 25 }
  const outlined = 'rounded-sm border border-border bg-card text-card-foreground'
  const chip = cn(CHIP, outlined, 'duration-[400ms]')
  const node = cn(CHIP, outlined, 'absolute top-1/2 -translate-y-1/2 justify-center')
  return (
    <div className='flex h-[clamp(5.5rem,15vh,7.5rem)] flex-col items-start justify-between'>
      <span className={cn(chip, on ? SHOWN : HIDDEN)}>task #401</span>
      <div
        className={cn(
          'relative w-[11.5rem] transition-opacity duration-500 motion-reduce:transition-none',
          on ? 'opacity-100' : 'opacity-0'
        )}
      >
        <svg viewBox='0 0 184 50' aria-hidden='true' className='block w-full overflow-visible'>
          <path ref={ring} d={RING_PATH} fill='none' strokeWidth='1.5' className='stroke-border' />
          <circle
            cx={ball.x}
            cy={ball.y}
            r='4.5'
            className={cn('transition-colors duration-500', done ? 'fill-success' : 'fill-foreground')}
          />
        </svg>
        <span className={cn(node, 'left-0 w-[4.5rem]')}>dev</span>
        <span className={cn(node, 'right-0 w-[6rem]')}>review</span>
      </div>
      <span
        className={cn(CHIP, 'rounded-sm border border-success text-success duration-[400ms]', done ? SHOWN : HIDDEN)}
      >
        ✓ pull request
      </span>
    </div>
  )
}

const STEPS: readonly Step[] = [
  {
    number: '01',
    title: 'Define',
    tag: 'milestones',
    role: 'you + architect',
    body: 'Define your features as milestones. As deep as you want.',
    Visual: DefineVisual
  },
  {
    number: '02',
    title: 'Plan',
    tag: 'tasks',
    role: 'you + planner',
    body: 'Plan the tasks. Push back until the plan is yours.',
    Visual: PlanVisual
  },
  {
    number: '03',
    title: 'Dispatch',
    tag: 'the loop',
    role: 'dev review driver',
    body: 'Agents write and review the code. Each task ends in a pull request, ready for your approval.',
    Visual: DispatchVisual
  }
]

function StepCard({
  index,
  step,
  pinned,
  active,
  sub
}: {
  index: number
  step: Step
  pinned: boolean
  active: number
  sub: number
}) {
  const slot = useRef<HTMLDivElement>(null)
  // Flowing layout: each card slides up the first time its top crosses 80% of the viewport.
  const entered = useSeen(slot, 0.8)
  const current = pinned && index === active
  // Pinned: the active and already-passed cards are lit and have drawn their visual; upcoming ones wait dimmed.
  const visible = pinned ? index <= active : entered
  const { Visual } = step

  return (
    <div ref={slot} className='flex min-w-0 flex-1 basis-[calc((36rem_-_100%)_*_999)]'>
      <Card
        className={cn(
          '@container flex w-full min-w-0 flex-col gap-0 rounded-lg border bg-card px-6 py-6 text-card-foreground shadow-none',
          'transition-[border-color,opacity,transform] duration-700 ease-out motion-reduce:transition-none',
          CARD_DELAYS[index],
          current ? 'border-foreground' : 'border-border',
          pinned
            ? visible
              ? 'opacity-100'
              : 'opacity-35'
            : entered
              ? 'translate-y-0 scale-100 opacity-100'
              : 'translate-y-12 scale-[0.96] opacity-0'
        )}
      >
        <div className='flex flex-1 flex-col gap-4 @[560px]:grid @[560px]:grid-cols-2 @[560px]:items-start @[560px]:gap-x-8 @[560px]:gap-y-3'>
          <div className='flex flex-wrap items-baseline gap-x-[0.9rem] gap-y-1 @[560px]:col-start-1 @[560px]:row-start-1'>
            <span className='font-mono text-sm tracking-[0.02em] text-muted-foreground'>{step.number}</span>
            <CardTitle className='font-sans text-3xl font-normal leading-[1.1] tracking-[-0.02em]'>
              {step.title}
            </CardTitle>
            <span className='font-mono text-lg uppercase tracking-[0.1em] text-muted-foreground'>{step.tag}</span>
          </div>
          <div className='flex min-w-0 flex-col gap-[0.6rem] @[560px]:col-start-1 @[560px]:row-start-2'>
            <span className='font-mono text-sm uppercase tracking-[0.04em] text-muted-foreground'>{step.role}</span>
            <Text className='text-lg leading-[1.45] text-pretty'>{step.body}</Text>
          </div>
          {/* The visual sits at the bottom of every card, so the three line up whatever the copy above runs to. */}
          <div className='mt-auto min-w-0 pt-2 font-mono text-[0.8125rem] @[560px]:col-start-2 @[560px]:row-span-2 @[560px]:row-start-1 @[560px]:mt-0 @[560px]:self-center @[560px]:pt-0'>
            <Visual on={visible} sub={pinned ? sub : 1} />
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
  // the last card's own share of the scroll, so its loop turns once as the reader scrolls through it
  const sub = Math.max(0, Math.min(1, progress * 3 - 2))

  return (
    <section
      id='tagline'
      ref={ref}
      className={cn('relative bg-secondary text-secondary-foreground', pinned && 'h-[300vh]')}
    >
      <div className={cn('flex items-center', pinned ? 'sticky top-0 min-h-screen' : 'relative')}>
        <div
          className={cn(
            'mx-auto flex w-full max-w-[73.75rem] flex-col px-6 sm:px-10',
            HEADER_GAP,
            pinned ? 'pb-6 pt-[4.75rem]' : 'py-14'
          )}
        >
          <SectionHeader className='gap-2'>
            <SectionTitle size='compact'>Define. Plan. Dispatch</SectionTitle>
            <SectionSubtitle>Milestones, tasks, then the loop</SectionSubtitle>
          </SectionHeader>
          <div className='flex flex-wrap items-stretch gap-3'>
            {STEPS.map((step, index) => (
              <StepCard key={step.number} index={index} step={step} pinned={pinned} active={active} sub={sub} />
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
