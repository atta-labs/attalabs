'use client'

import { Badge, Card, CardContent } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight, CircleDot, GitBranch, GitMerge, Milestone, RotateCcw, User } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentType, type RefObject } from 'react'
import { siGithub } from 'simple-icons'
import { SectionOverline, SectionTitle } from './SectionHeading'

type StageIndex = 0 | 1 | 2

const ISSUE_DELAYS = ['delay-[140ms]', 'delay-[260ms]', 'delay-[380ms]'] as const
const LANE_DELAYS = [
  ['delay-0', 'delay-[160ms]', 'delay-[320ms]'],
  ['delay-[100ms]', 'delay-[340ms]', 'delay-[580ms]'],
  ['delay-[50ms]', 'delay-[240ms]', 'delay-[440ms]']
] as const
const BACK_DELAYS = ['delay-0', 'delay-[100ms]', 'delay-[200ms]'] as const

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true' className={className}>
      <path d={siGithub.path} />
    </svg>
  )
}

function GitHubBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge className='mt-4 gap-2 self-start rounded-full px-3 py-1.5 font-mono text-[0.59375rem] uppercase tracking-[0.16em]'>
      <GitHubMark className='size-3' />
      {children}
    </Badge>
  )
}

function PhaseLabel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-current={active ? 'step' : undefined}
      className={`relative inline-flex transition-[color,opacity,translate] duration-300 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
        active ? '-translate-y-0.5 text-foreground opacity-100' : 'translate-y-0 text-muted-foreground opacity-50'
      }`}
    >
      {children}
      <span
        aria-hidden='true'
        className={`absolute -bottom-1 left-0 h-0.5 bg-foreground transition-[width,opacity] duration-300 ease-out motion-reduce:transition-none ${
          active ? 'w-full opacity-100' : 'w-0 opacity-0'
        }`}
      />
    </span>
  )
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className='mt-5 flex flex-col gap-2.5'>
      {items.map((item) => (
        <li key={item} className='flex items-baseline gap-3 font-sans text-lg leading-tight tracking-tight'>
          <span className='size-1.5 shrink-0 -translate-y-0.5 rounded-full bg-foreground' />
          {item}
        </li>
      ))}
    </ul>
  )
}

function ObjectCard({
  icon: Icon,
  children,
  primary = false,
  compact = false,
  className = ''
}: {
  icon: ComponentType<{ className?: string }>
  children: React.ReactNode
  primary?: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <Card
      className={`gap-0 shadow-none ${compact ? 'py-2' : 'py-2.5'} ${primary ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'} ${className}`}
    >
      <CardContent
        className={`flex items-center font-mono tracking-wide ${compact ? 'gap-1.5 px-2.5 text-[0.6875rem]' : 'gap-2.5 px-3.5 text-[0.78125rem]'}`}
      >
        <Icon className={compact ? 'size-3 shrink-0' : 'size-4 shrink-0'} />
        {children}
      </CardContent>
    </Card>
  )
}

function StageShell({
  index,
  title,
  headline,
  bullets,
  badge,
  active,
  stageRef,
  children
}: {
  index: string
  title: string
  headline: React.ReactNode
  bullets: readonly string[]
  badge: string
  active: boolean
  stageRef: RefObject<HTMLDivElement | null>
  children: React.ReactNode
}) {
  return (
    <article
      data-active={active}
      className='group/stage flex min-h-[42rem] flex-col rounded border-2 border-border bg-card px-7 py-8 min-[700px]:min-h-0 min-[700px]:flex-row min-[700px]:items-start min-[700px]:gap-x-8 min-[700px]:px-9 min-[700px]:py-6'
    >
      <div className='flex flex-col'>
        <div className='flex items-baseline gap-3 font-mono uppercase'>
          <span className='text-xs tracking-[0.26em] text-muted-foreground'>{index}</span>
          <span className='text-2xl font-semibold tracking-[0.14em] md:text-3xl'>{title}</span>
        </div>
        <Heading level={3} weight='normal' className='mt-4 font-serif text-3xl leading-none tracking-tight md:text-4xl'>
          {headline}
        </Heading>
        <BulletList items={bullets} />
        <GitHubBadge>{badge}</GitHubBadge>
      </div>
      <div
        ref={stageRef}
        className='mt-7 flex min-h-52 flex-1 flex-col justify-center border-t border-border pt-6 min-[700px]:mt-0 min-[700px]:min-w-48 min-[700px]:border-t-0 min-[700px]:pt-0'
      >
        {children}
      </div>
    </article>
  )
}

function PlanStage({ active, stageRef }: { active: boolean; stageRef: RefObject<HTMLDivElement | null> }) {
  return (
    <StageShell
      index='01'
      title='plan a milestone'
      headline={
        <>
          A milestone.
          <br />
          Its issues
        </>
      }
      bullets={['One milestone', 'One issue per task']}
      badge='milestone + issues'
      active={active}
      stageRef={stageRef}
    >
      <div className='flex flex-col gap-2'>
        <ObjectCard icon={Milestone} primary>
          <span>Milestone</span>
          <span className='ml-auto flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.16em]'>
            <User className='size-3' /> you
          </span>
        </ObjectCard>
        <div className='grid grid-cols-3 gap-1.5'>
          {[471, 472, 473].map((issue, index) => (
            <div
              key={issue}
              className={`transition-all duration-500 ease-out ${ISSUE_DELAYS[index]} ${
                active ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
              }`}
            >
              <ObjectCard icon={CircleDot} compact>
                #{issue}
              </ObjectCard>
            </div>
          ))}
        </div>
      </div>
    </StageShell>
  )
}

function SolveStage({ active, stageRef }: { active: boolean; stageRef: RefObject<HTMLDivElement | null> }) {
  const lanes = [471, 472, 473] as const
  return (
    <StageShell
      index='02'
      title='solve its tasks'
      headline={
        <>
          One issue.
          <br />
          One pull request
        </>
      }
      bullets={['One branch', 'One pull request']}
      badge='branch + pull request'
      active={active}
      stageRef={stageRef}
    >
      <div className='flex flex-col gap-2'>
        {lanes.map((issue, lane) => (
          <div
            key={issue}
            className='grid grid-cols-3 gap-1.5 min-[700px]:grid-cols-[max-content_max-content_max-content]'
          >
            <div
              className={`transition-all duration-500 ${LANE_DELAYS[lane]?.[0] ?? ''} ${active ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'}`}
            >
              <ObjectCard icon={CircleDot} compact>
                #{issue}
              </ObjectCard>
            </div>
            <div
              className={`transition-all duration-500 ${LANE_DELAYS[lane]?.[1] ?? ''} ${active ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'}`}
            >
              <ObjectCard icon={GitBranch} compact>
                branch
              </ObjectCard>
            </div>
            <div
              className={`transition-all duration-500 ${LANE_DELAYS[lane]?.[2] ?? ''} ${active ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'}`}
            >
              <ObjectCard icon={GitMerge} primary compact>
                merged
                {lane === 0 && (
                  <span className='ml-auto flex items-center gap-1 text-[0.55rem] font-bold uppercase tracking-widest'>
                    <User className='size-2.5' /> you
                  </span>
                )}
              </ObjectCard>
            </div>
          </div>
        ))}
      </div>
    </StageShell>
  )
}

function ArchiveStage({
  active,
  closed,
  stageRef
}: {
  active: boolean
  closed: boolean
  stageRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <StageShell
      index='03'
      title='archive a milestone'
      headline={
        <>
          Every issue closed.
          <br />
          Then the milestone
        </>
      }
      bullets={['Nothing by hand', 'Closes when the last task lands']}
      badge='milestone closed'
      active={active}
      stageRef={stageRef}
    >
      <div className='flex flex-col gap-2'>
        <ObjectCard icon={Milestone} primary>
          <span className='grid'>
            <span className={`col-start-1 row-start-1 transition-opacity ${closed ? 'opacity-0' : 'opacity-100'}`}>
              Milestone
            </span>
            <span className={`col-start-1 row-start-1 transition-opacity ${closed ? 'opacity-100' : 'opacity-0'}`}>
              Closed
            </span>
          </span>
          <span className='ml-auto flex items-center gap-1.5 text-[0.625rem] font-bold uppercase tracking-[0.16em]'>
            <User className='size-3' /> you
          </span>
        </ObjectCard>
        <div className='grid grid-cols-3 gap-1.5'>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className={`transition-all duration-500 ${BACK_DELAYS[item]} ${
                active ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
              }`}
            >
              <ObjectCard icon={GitMerge} compact>
                Merged
              </ObjectCard>
            </div>
          ))}
        </div>
        <Text className='mt-1 flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground'>
          <RotateCcw className='size-3' /> the next one opens
        </Text>
      </div>
    </StageShell>
  )
}

function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

export function LifecycleSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const railFillRef = useRef<HTMLSpanElement>(null)
  const stageOneRef = useRef<HTMLDivElement>(null)
  const stageTwoRef = useRef<HTMLDivElement>(null)
  const stageThreeRef = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)
  const [phase, setPhase] = useState<StageIndex>(0)
  const [run, setRun] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    const railFill = railFillRef.current
    if (!section || !track || !railFill) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    setArmed(true)
    const target = scrollParent(section)
    const frame = track.parentElement
    if (!frame) return
    let animationFrame = 0
    let closeTimer = 0
    let trackOffset = Math.max(0, track.scrollWidth - frame.clientWidth)
    const trackAnimation = track.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(-${trackOffset}px)` }],
      {
        duration: 1000,
        fill: 'both'
      }
    )
    const railAnimation = railFill.animate([{ width: '0%' }, { width: '100%' }], {
      duration: 1000,
      fill: 'both'
    })
    trackAnimation.pause()
    railAnimation.pause()

    const syncTrackOffset = () => {
      const nextOffset = Math.max(0, track.scrollWidth - frame.clientWidth)
      if (Math.abs(nextOffset - trackOffset) < 0.5) return
      trackOffset = nextOffset
      const effect = trackAnimation.effect
      if (effect instanceof KeyframeEffect) {
        effect.setKeyframes([{ transform: 'translateX(0)' }, { transform: `translateX(-${trackOffset}px)` }])
      }
    }

    const scheduleClose = (entering: boolean) => {
      window.clearTimeout(closeTimer)
      if (entering) closeTimer = window.setTimeout(() => setClosed(true), 800)
      else setClosed(false)
    }

    const evaluate = () => {
      animationFrame = 0
      const rect = section.getBoundingClientRect()
      const viewportHeight = window.innerHeight || 800
      if (window.innerWidth < 700) {
        const nextRun = [stageOneRef, stageTwoRef, stageThreeRef].map((ref) => {
          const node = ref.current
          if (!node) return false
          const bounds = node.getBoundingClientRect()
          return bounds.top < viewportHeight * 0.82 && bounds.bottom > viewportHeight * 0.08
        }) as [boolean, boolean, boolean]
        setRun((current) => {
          if (nextRun[2] !== current[2]) scheduleClose(nextRun[2])
          return nextRun.some((value, index) => value !== current[index]) ? nextRun : current
        })
        return
      }

      syncTrackOffset()
      const travel = Math.max(1, rect.height - (viewportHeight - 64))
      const progress = Math.max(0, Math.min(1, (64 - rect.top) / travel))
      trackAnimation.currentTime = progress * 1000
      railAnimation.currentTime = progress * 1000
      const segment = progress * 3
      const nextRun = [0, 1, 2].map((index) => segment >= index + 0.1 && segment < index + 1.35) as [
        boolean,
        boolean,
        boolean
      ]
      const nextPhase = Math.min(2, Math.floor(segment)) as StageIndex
      setPhase(nextPhase)
      setRun((current) => {
        if (nextRun[2] !== current[2]) scheduleClose(nextRun[2])
        return nextRun.some((value, index) => value !== current[index]) ? nextRun : current
      })
    }
    const queue = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(evaluate)
    }

    target.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    const poll = window.setInterval(queue, 250)
    const resizeObserver = new ResizeObserver(queue)
    resizeObserver.observe(section)
    evaluate()
    return () => {
      target.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      window.clearInterval(poll)
      resizeObserver.disconnect()
      cancelAnimationFrame(animationFrame)
      window.clearTimeout(closeTimer)
      trackAnimation.cancel()
      railAnimation.cancel()
    }
  }, [])

  // Before the motion controller arms (including reduced-motion), every object rests
  // in the design's readable static state. Once armed, the active phase drives it.
  const active = run.map((isRunning) => armed && isRunning) as [boolean, boolean, boolean]

  return (
    <section ref={sectionRef} id='what-it-is' className='border-b-2 border-border min-[700px]:h-[300dvh]'>
      <div className='mx-auto flex max-w-[82.5rem] flex-col px-6 py-20 min-[700px]:sticky min-[700px]:top-0 min-[700px]:h-[calc(100dvh-4.5rem)] min-[700px]:overflow-hidden min-[700px]:px-10 min-[700px]:py-6'>
        <div className='flex flex-wrap items-baseline justify-between gap-5'>
          <SectionOverline className='text-muted-foreground'>the software lifecycle you already run</SectionOverline>
          <NextLink
            href='/life-cycle'
            variant='unstyled'
            className='inline-flex items-center gap-2 border-b border-current pb-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em]'
          >
            See lifecycle <ArrowRight className='size-3.5' />
          </NextLink>
        </div>
        <div className='mt-4 flex items-center gap-4'>
          <Card className='flex size-16 shrink-0 items-center justify-center shadow-none md:size-20'>
            <GitHubMark className='size-9 md:size-12' />
          </Card>
          <div>
            <SectionTitle className='max-w-5xl'>Plan, solve, archive</SectionTitle>
            <Text className='mt-2 max-w-xl text-base leading-snug text-muted-foreground md:text-lg'>
              The same three stages, every time you ship.
            </Text>
          </div>
        </div>

        <div className='mt-5 hidden items-center gap-7 border-t border-border pt-3 min-[700px]:flex'>
          <div className='flex shrink-0 gap-7 font-mono text-[0.625rem] uppercase tracking-[0.18em]'>
            <PhaseLabel active={phase === 0}>01 plan a milestone</PhaseLabel>
            <PhaseLabel active={phase === 1}>02 solve its tasks</PhaseLabel>
            <PhaseLabel active={phase === 2}>03 archive a milestone</PhaseLabel>
          </div>
          <div className='relative h-0.5 flex-1 overflow-hidden rounded-full bg-border'>
            <span ref={railFillRef} className='absolute inset-y-0 left-0 w-0 bg-foreground' />
          </div>
        </div>

        <div className='mt-7 overflow-hidden min-[700px]:mt-3 min-[700px]:min-h-0 min-[700px]:flex-none'>
          <div
            ref={trackRef}
            className='grid h-full gap-4 min-[700px]:w-max min-[700px]:grid-cols-[repeat(3,max-content)] min-[700px]:items-start'
          >
            <PlanStage active={active[0]} stageRef={stageOneRef} />
            <SolveStage active={active[1]} stageRef={stageTwoRef} />
            <ArchiveStage active={active[2]} closed={closed} stageRef={stageThreeRef} />
          </div>
        </div>
      </div>
    </section>
  )
}
