'use client'

import { Badge } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type StepTag = 'YOU' | 'AGENT' | null

type Step = {
  label: string
  tag: StepTag
  atMs: number
  refused?: boolean
}

type Lane = {
  id: number
  title: string
  subtitle: string
  steps: Step[]
}

const TOTAL_MS = 25000

// Beats: the Issue's own list (planner cuts issues → labels land → two agents take two
// tasks → briefs authored → PR carrying the brief → two verdicts → merge → archive → wrap
// up), spread across three task lanes that do NOT move in lockstep — Task 2 (light) clears
// early and holds; Task 3's refused → fixed pair gets a wider gap than any other step, since
// the recovery beat is the one thing this timeline exists to show. `atMs` values are hand-
// paced, not derived — this is a marketing visual, not a scheduler.
const LANES: Lane[] = [
  {
    id: 1,
    title: 'Task 1',
    subtitle: 'heavy — you sat in most seats',
    steps: [
      { label: 'issue', tag: 'YOU', atMs: 2500 },
      { label: 'brief', tag: 'YOU', atMs: 5000 },
      { label: 'PR', tag: 'AGENT', atMs: 8000 },
      { label: 'review', tag: 'YOU', atMs: 11000 },
      { label: 'test plan', tag: 'YOU', atMs: 14000 },
      { label: 'verify', tag: null, atMs: 17000 },
      { label: 'merged', tag: null, atMs: 19500 },
      { label: 'closed', tag: null, atMs: 21500 }
    ]
  },
  {
    id: 2,
    title: 'Task 2',
    subtitle: "light — agents held everything but the one you can't delegate",
    steps: [
      { label: 'issue', tag: 'AGENT', atMs: 3000 },
      { label: 'brief', tag: 'AGENT', atMs: 5000 },
      { label: 'PR', tag: 'AGENT', atMs: 7000 },
      { label: 'review', tag: 'AGENT', atMs: 9000 },
      { label: 'test plan', tag: 'YOU', atMs: 11500 },
      { label: 'verify', tag: null, atMs: 14000 },
      { label: 'merged', tag: null, atMs: 16000 },
      { label: 'closed', tag: null, atMs: 18000 }
    ]
  },
  {
    id: 3,
    title: 'Task 3',
    subtitle: 'mixed — and it was refused once',
    steps: [
      { label: 'issue', tag: 'AGENT', atMs: 3500 },
      { label: 'brief', tag: 'YOU', atMs: 6500 },
      { label: 'refused', tag: null, atMs: 9500, refused: true },
      { label: 'fixed', tag: 'AGENT', atMs: 13000 },
      { label: 'test plan', tag: 'YOU', atMs: 15500 },
      { label: 'verify', tag: null, atMs: 18500 },
      { label: 'merged', tag: null, atMs: 20500 },
      { label: 'closed', tag: null, atMs: 22000 }
    ]
  }
]

function formatTime(ms: number): string {
  const seconds = Math.round(ms / 1000)
  return `0:${String(seconds).padStart(2, '0')}`
}

function StepChip({ step, reached }: { step: Step; reached: boolean }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors duration-300',
        !reached && 'border-border bg-background opacity-30',
        reached && step.refused && 'border-destructive bg-destructive/10',
        reached && !step.refused && 'border-primary/50 bg-card opacity-100'
      )}
    >
      {step.tag && (
        <Badge variant={step.tag === 'YOU' ? 'outline' : 'secondary'} className='px-1.5 py-0 text-[0.6rem]'>
          {step.tag}
        </Badge>
      )}
      <Text as='span' size='xs' className={cn('font-mono', step.refused ? 'text-destructive' : 'text-foreground')}>
        {step.label}
      </Text>
    </div>
  )
}

function LaneRow({ lane, progressMs }: { lane: Lane; progressMs: number }) {
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-baseline gap-2'>
        <Text as='span' size='sm' className='font-mono font-semibold text-foreground'>
          {lane.title}
        </Text>
        <Text as='span' size='xs' muted>
          {lane.subtitle}
        </Text>
      </div>
      <div className='flex flex-wrap items-center gap-2 overflow-x-auto'>
        {lane.steps.map((step, index) => (
          <div key={step.label + index} className='flex items-center gap-2'>
            {index > 0 && (
              <Text as='span' size='xs' muted aria-hidden>
                →
              </Text>
            )}
            <StepChip step={step} reached={progressMs >= step.atMs} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** The binding animation spec from Issue #918 §2: autoplays on scroll into view (no
 * play-button gate), ~25s, three lanes, one lane (Task 3) refuses and recovers,
 * `prefers-reduced-motion` renders the resolved end frame instead of animating.
 * DOM/CSS state transitions only — `progressMs` gates each `StepChip`'s own transition,
 * nothing here is an animated SVG. */
export function SwimlaneTimeline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const startedAtRef = useRef<number | null>(null)
  const [progressMs, setProgressMs] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReducedMotion(reduced)
    if (reduced) {
      setProgressMs(TOTAL_MS)
      return
    }

    const element = containerRef.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          startedAtRef.current = null
          setPlaying(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return

    const tick = (now: number) => {
      if (startedAtRef.current === null) startedAtRef.current = now - progressMs
      const elapsed = now - startedAtRef.current
      if (elapsed >= TOTAL_MS) {
        setProgressMs(TOTAL_MS)
        setPlaying(false)
        return
      }
      setProgressMs(elapsed)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
    // progressMs deliberately excluded — it's read once via ref-anchored math above so the
    // effect doesn't tear down and restart its own rAF loop on every frame it produces.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  function handleScrub(nextMs: number) {
    setPlaying(false)
    startedAtRef.current = null
    setProgressMs(nextMs)
  }

  function handleReplay() {
    startedAtRef.current = null
    setProgressMs(0)
    setPlaying(true)
  }

  return (
    <div ref={containerRef} className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          One tranche · three tasks · time runs left to right
        </Text>
        <div className='flex items-center gap-4'>
          <Text as='span' size='xs' className='font-mono text-foreground'>
            {formatTime(progressMs)} / {formatTime(TOTAL_MS)}
          </Text>
          <div className='flex items-center gap-2'>
            <Badge variant='outline'>RING 0</Badge>
            <Badge variant='outline'>RING 1</Badge>
            <Badge variant='outline'>RING 2</Badge>
          </div>
        </div>
      </div>

      <div className='rounded-lg border border-border bg-card p-5'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          {progressMs <= 0
            ? 'milestone opens'
            : progressMs >= TOTAL_MS
              ? 'wrap up — the milestone closes'
              : 'tranche in flight'}
        </Text>

        <div className='mt-4 flex flex-col gap-6'>
          {LANES.map((lane) => (
            <LaneRow key={lane.id} lane={lane} progressMs={progressMs} />
          ))}
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-between gap-4'>
        <input
          type='range'
          min={0}
          max={TOTAL_MS}
          step={100}
          value={progressMs}
          onChange={(event) => handleScrub(Number(event.target.value))}
          aria-label='Scrub the tranche timeline'
          className='h-1.5 w-full max-w-md flex-1 cursor-pointer accent-primary'
        />
        <button
          type='button'
          onClick={handleReplay}
          className='inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground hover:bg-accent hover:text-accent-foreground'
        >
          <RotateCcw className='size-3.5' aria-hidden />
          Replay
        </button>
      </div>

      {reducedMotion && (
        <Text as='p' size='xs' muted>
          Motion is reduced on this device — showing the tranche resolved, at the end of the run.
        </Text>
      )}

      <div className='flex flex-col gap-1'>
        <Text as='p' className='font-medium text-foreground'>
          Every seat can be yours.
        </Text>
        <Text as='p' size='sm' muted className='font-mono uppercase tracking-widest'>
          One of them always is
        </Text>
      </div>
    </div>
  )
}
