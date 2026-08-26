'use client'

import { Button, Card } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import {
  Archive,
  Check,
  CheckCircle2,
  CircleDot,
  Code2,
  Eye,
  FileText,
  Flag,
  GitBranch,
  Layers,
  RotateCcw,
  Send,
  Shield,
  Wrench,
  type LucideIcon
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { LifeCycleId } from '../_lib/life-cycles'
import type { TimelineContent } from '../_lib/lifecycle-content'

const DURATION_MS = 10000

type Tone = 'neutral' | 'success' | 'blocked'
type Cell =
  | { kind: 'chip'; label: string; icon: LucideIcon; at: number; tone?: Tone; endpoint?: boolean }
  | { kind: 'bar'; label: string; icon: LucideIcon; at: number; growUntil: number; minRem: number; maxRem: number }
  | { kind: 'gap'; at: number; growUntil: number; maxRem?: number; full?: boolean }
  | { kind: 'spacer'; width: string }

type Lane = { label: string; cells: Cell[] }

function laneSet(id: LifeCycleId): { lanes: Lane[]; caption: { at: number; text: string }[] } {
  if (id === 'milestone') {
    return {
      lanes: [
        {
          label: 'goal',
          cells: [
            { kind: 'chip', label: 'milestone opens', icon: Flag, at: 2, endpoint: true },
            { kind: 'gap', at: 2, growUntil: 98, full: true },
            { kind: 'chip', label: 'milestone complete', icon: Flag, at: 98, endpoint: true }
          ]
        },
        {
          label: 'tranche 1',
          cells: [
            { kind: 'chip', label: 'plan', icon: FileText, at: 8 },
            { kind: 'gap', at: 8, growUntil: 14, maxRem: 1.5 },
            { kind: 'bar', label: 'execute', icon: GitBranch, at: 14, growUntil: 55, minRem: 5, maxRem: 13 },
            { kind: 'chip', label: 'archive', icon: Archive, at: 55, tone: 'success' }
          ]
        },
        {
          label: 'tranche 2',
          cells: [
            { kind: 'spacer', width: 'w-16' },
            { kind: 'chip', label: 'plan', icon: FileText, at: 20 },
            { kind: 'gap', at: 20, growUntil: 26, maxRem: 1.5 },
            { kind: 'bar', label: 'execute', icon: GitBranch, at: 26, growUntil: 92, minRem: 5, maxRem: 19 },
            { kind: 'chip', label: 'archive', icon: Archive, at: 92, tone: 'success' }
          ]
        },
        {
          label: 'tranche N',
          cells: [
            { kind: 'spacer', width: 'w-10' },
            { kind: 'chip', label: 'plan', icon: FileText, at: 32 },
            { kind: 'chip', label: 'blocked by tranche 1', icon: Layers, at: 40, tone: 'blocked' },
            { kind: 'gap', at: 40, growUntil: 55, maxRem: 2.5 },
            { kind: 'bar', label: 'execute', icon: GitBranch, at: 55, growUntil: 82, minRem: 5, maxRem: 10 },
            { kind: 'chip', label: 'archive', icon: Archive, at: 82, tone: 'success' }
          ]
        }
      ],
      caption: [
        { at: 0, text: 'the architect opens the milestone' },
        { at: 8, text: 'tranche 1 is planned' },
        { at: 20, text: 'tranche 2 is planned' },
        { at: 32, text: 'tranche N is planned, blocked on tranche 1' },
        { at: 55, text: 'tranche 1 archives — tranche N unblocks' },
        { at: 82, text: 'tranche N archives' },
        { at: 92, text: 'tranche 2 archives — the last one' },
        { at: 98, text: 'the milestone completes' }
      ]
    }
  }
  if (id === 'tranche') {
    return {
      lanes: [
        {
          label: 'tranche',
          cells: [
            { kind: 'chip', label: 'tranche opens', icon: Layers, at: 2, endpoint: true },
            { kind: 'gap', at: 2, growUntil: 98, full: true },
            { kind: 'chip', label: 'tranche archives', icon: Archive, at: 98, endpoint: true }
          ]
        },
        {
          label: 'task 1',
          cells: [
            { kind: 'chip', label: 'dispatch', icon: Send, at: 8 },
            { kind: 'gap', at: 8, growUntil: 14, maxRem: 1.5 },
            { kind: 'bar', label: 'run', icon: GitBranch, at: 14, growUntil: 55, minRem: 5, maxRem: 13 },
            { kind: 'chip', label: 'merged', icon: GitBranch, at: 55, tone: 'success' }
          ]
        },
        {
          label: 'task 2',
          cells: [
            { kind: 'spacer', width: 'w-16' },
            { kind: 'chip', label: 'dispatch', icon: Send, at: 20 },
            { kind: 'gap', at: 20, growUntil: 26, maxRem: 1.5 },
            { kind: 'bar', label: 'run', icon: GitBranch, at: 26, growUntil: 92, minRem: 5, maxRem: 19 },
            { kind: 'chip', label: 'merged', icon: GitBranch, at: 92, tone: 'success' }
          ]
        },
        {
          label: 'task N',
          cells: [
            { kind: 'spacer', width: 'w-10' },
            { kind: 'chip', label: 'dispatch', icon: Send, at: 32 },
            { kind: 'chip', label: 'depends on task 1', icon: Layers, at: 40, tone: 'blocked' },
            { kind: 'gap', at: 40, growUntil: 55, maxRem: 2.5 },
            { kind: 'bar', label: 'run', icon: GitBranch, at: 55, growUntil: 82, minRem: 5, maxRem: 10 },
            { kind: 'chip', label: 'merged', icon: GitBranch, at: 82, tone: 'success' }
          ]
        }
      ],
      caption: [
        { at: 0, text: 'the planner cuts the tranche' },
        { at: 8, text: 'task 1 dispatches' },
        { at: 20, text: 'task 2 dispatches' },
        { at: 32, text: 'task N dispatches, depends on task 1' },
        { at: 55, text: 'task 1 merges — task N unblocks and runs' },
        { at: 82, text: 'task N merges' },
        { at: 92, text: 'task 2 merges — the last one' },
        { at: 98, text: 'wrap up — the tranche archives' }
      ]
    }
  }
  return {
    lanes: [
      {
        label: 'issue',
        cells: [
          { kind: 'chip', label: 'issue opens', icon: CircleDot, at: 2, endpoint: true },
          { kind: 'gap', at: 2, growUntil: 96, full: true },
          { kind: 'chip', label: 'merged · archived', icon: CheckCircle2, at: 96, endpoint: true }
        ]
      },
      {
        label: 'code',
        cells: [
          { kind: 'chip', label: 'brief', icon: FileText, at: 10 },
          { kind: 'chip', label: 'develop', icon: Code2, at: 18 },
          { kind: 'chip', label: 'pr open', icon: GitBranch, at: 26 },
          { kind: 'gap', at: 26, growUntil: 62, maxRem: 10 },
          { kind: 'chip', label: 'fix', icon: Wrench, at: 62 }
        ]
      },
      {
        label: 'review',
        cells: [
          { kind: 'spacer', width: 'w-24' },
          { kind: 'gap', at: 26, growUntil: 34, maxRem: 4 },
          { kind: 'chip', label: 'review', icon: Eye, at: 34 },
          { kind: 'chip', label: 'changes', icon: RotateCcw, at: 40, tone: 'blocked' },
          { kind: 'gap', at: 40, growUntil: 72, maxRem: 4 },
          { kind: 'chip', label: 'review', icon: Eye, at: 72 },
          { kind: 'chip', label: 'approved', icon: Check, at: 80, tone: 'success' }
        ]
      },
      {
        label: 'security',
        cells: [
          { kind: 'spacer', width: 'w-24' },
          { kind: 'gap', at: 26, growUntil: 34, maxRem: 4 },
          { kind: 'chip', label: 'security', icon: Shield, at: 34 },
          { kind: 'chip', label: 'cleared', icon: Check, at: 44, tone: 'success' }
        ]
      }
    ],
    caption: [
      { at: 0, text: 'the issue is cut' },
      { at: 10, text: 'the brief author writes the work order' },
      { at: 18, text: 'the developer writes the code' },
      { at: 26, text: 'the pull request opens' },
      { at: 34, text: 'review and security read the same pr, side by side' },
      { at: 40, text: 'review sends it back — changes requested' },
      { at: 62, text: 'the developer pushes a fix' },
      { at: 72, text: 'review reads it again' },
      { at: 80, text: 'review approves — second pass' },
      { at: 96, text: 'second pass clears — verify, merge, archive follow' }
    ]
  }
}

function toneClasses(tone: Tone | undefined, endpoint: boolean | undefined) {
  if (endpoint) return 'border-foreground bg-foreground text-background'
  if (tone === 'success') return 'border-success text-success'
  if (tone === 'blocked') return 'border-destructive text-destructive'
  return 'border-foreground/60 text-foreground'
}

function clampSpan(progress: number, at: number, growUntil: number) {
  return Math.max(0, Math.min(1, (progress - at) / Math.max(0.001, growUntil - at)))
}

function LaneRow({ lane, progress }: { lane: Lane; progress: number }) {
  return (
    <div className='flex items-center gap-3 border-t border-border py-3 first:border-t-0'>
      <Text as='span' size='xs' muted className='w-20 shrink-0 font-mono uppercase tracking-widest'>
        {lane.label}
      </Text>
      <div className='flex flex-1 flex-wrap items-center gap-2'>
        {lane.cells.map((cell, index) => {
          if (cell.kind === 'spacer') return <span key={index} className={`${cell.width} shrink-0`} />

          if (cell.kind === 'gap') {
            const visible = progress >= cell.at
            const span = clampSpan(progress, cell.at, cell.growUntil)
            return (
              <span
                key={index}
                aria-hidden
                className={`h-px origin-left bg-foreground/40 transition-opacity duration-150 ${cell.full ? 'flex-1' : 'shrink-0'} ${visible ? 'opacity-100' : 'opacity-0'}`}
                style={{ width: cell.full ? undefined : `${cell.maxRem}rem`, transform: `scaleX(${span})` }}
              />
            )
          }

          if (cell.kind === 'bar') {
            const visible = progress >= cell.at
            const span = clampSpan(progress, cell.at, cell.growUntil)
            const Icon = cell.icon
            return (
              <span
                key={index}
                className={`relative inline-flex h-8 shrink-0 items-center gap-1.5 overflow-hidden rounded-md border border-foreground/60 px-3 font-mono text-xs whitespace-nowrap text-foreground transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
                style={{
                  width: `${cell.minRem + span * (cell.maxRem - cell.minRem)}rem`,
                  backgroundImage:
                    'repeating-linear-gradient(115deg, color-mix(in oklch, var(--foreground) 18%, transparent) 0 2px, transparent 2px 7px)'
                }}
              >
                <Icon className='size-3.5 shrink-0' aria-hidden />
                {cell.label}
              </span>
            )
          }

          const visible = progress >= cell.at
          const Icon = cell.icon
          return (
            <span
              key={index}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 font-mono text-xs transition-all duration-200 ${cell.endpoint ? '' : 'rounded-md'} ${toneClasses(cell.tone, cell.endpoint)} ${visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
            >
              <Icon className='size-3.5 shrink-0' aria-hidden />
              {cell.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// The multi-lane "played once at speed, replay it" swimlane — a faithful port
// of the mockup's structure and mechanism: boxes grow in width/scale as the
// playhead crosses them (not fade in at full size, then fill a texture
// inside), driven by one progress value instead of the mockup's per-element
// CSS-variable choreography. Real components (Card/Button), plain Tailwind.
export function LifeCycleTimeline({ altitude, content }: { altitude: LifeCycleId; content: TimelineContent }) {
  const [progress, setProgress] = useState(0)
  const frame = useRef(0)
  const startedAt = useRef(0)
  const { lanes, caption } = laneSet(altitude)

  const play = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(100)
      return
    }
    startedAt.current = performance.now()
    let lastRenderedAt = 0
    const tick = (now: number) => {
      const elapsed = now - startedAt.current
      const next = Math.min(100, (elapsed / DURATION_MS) * 100)
      // Real elapsed time drives `next`, so this can never drift — but calling
      // setProgress on every single rAF tick (~60/s) re-renders every lane and
      // cell that often, and if that render work misses a frame budget the
      // visible motion falls behind real time even though the math is exact.
      // Committing at a fixed ~30fps cuts render count without touching timing.
      if (next >= 100 || now - lastRenderedAt >= 33) {
        lastRenderedAt = now
        setProgress(next)
      }
      if (next < 100) frame.current = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(frame.current)
    setProgress(0)
    frame.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    play()
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [altitude])

  const activeCaption = [...caption].reverse().find((c) => progress >= c.at) ?? caption[0]

  return (
    <Card className='mx-auto w-full max-w-4xl overflow-x-auto'>
      <div className='flex items-center justify-between gap-4 border-b border-border px-6 py-3'>
        <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
          {content.meta}
        </Text>
        <Text as='span' size='xs' className='font-mono tabular-nums'>
          {((Math.min(progress, 100) / 100) * (DURATION_MS / 1000)).toFixed(1)}s / {(DURATION_MS / 1000).toFixed(1)}s
        </Text>
      </div>
      <div className='min-w-[42rem] px-6 py-2'>
        {lanes.map((lane) => (
          <LaneRow key={lane.label} lane={lane} progress={progress} />
        ))}
      </div>
      <div className='flex flex-wrap items-center gap-4 border-t border-border px-6 py-3'>
        <Text as='span' size='xs' muted className='min-w-0 flex-1 font-mono uppercase tracking-widest'>
          {activeCaption?.text}
        </Text>
        <div className='h-1 w-40 shrink-0 overflow-hidden rounded-full bg-muted'>
          <div className='h-full rounded-full bg-foreground' style={{ width: `${progress}%` }} />
        </div>
        <Button type='button' variant='outline' size='sm' onClick={play} className='shrink-0 gap-2'>
          <RotateCcw className='size-3.5' aria-hidden />
          Replay
        </Button>
      </div>
    </Card>
  )
}
