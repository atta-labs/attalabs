import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { ArrowRight, RotateCcw } from 'lucide-react'
import type { SVGProps } from 'react'
import { stageById, type StageId } from '../_lib/stages'
import { StageGlyph } from './StageGlyph'

/**
 * The overview's composition — the same seven glyphs `StagePage` renders one
 * at a time, arranged into the shape the loop actually has: one row for
 * Plan, a middle band for the four stages that run once per task (Brief,
 * Develop, Review and Security together on one pull request, Archive), one
 * row for Wrap-up, and the return edge back into Plan. This is never a
 * master image cropped per page — see `StageGlyph.tsx`'s doc comment for
 * why each stage's glyph has to stand alone first.
 */

const CONNECTOR_FRAME = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
} satisfies SVGProps<SVGSVGElement>

function StageTile({ id }: { id: StageId }) {
  const stage = stageById(id)
  return (
    <NextLink
      href={`/start/${id}`}
      variant='unstyled'
      className='group flex flex-col items-center gap-1.5 text-foreground'
    >
      <div className='flex size-16 items-center justify-center rounded-md border border-border bg-accent text-accent-foreground transition-colors group-hover:border-primary'>
        <StageGlyph stageId={id} className='h-9 w-auto' />
      </div>
      <span className='font-sans text-xs font-medium'>{stage.label}</span>
    </NextLink>
  )
}

function StepArrow() {
  return <ArrowRight className='size-4 shrink-0 text-muted-foreground' aria-hidden />
}

/** One node splitting into three — Plan handing off to every task in the
 * tranche at once, not to a single next step. */
function FanOut() {
  return (
    <svg viewBox='0 0 80 28' {...CONNECTOR_FRAME} className='h-7 w-20 text-muted-foreground'>
      <circle cx='40' cy='3' r='2.2' fill='currentColor' stroke='none' />
      <path d='M40 5 20 23M40 5 40 23M40 5 60 23' />
      <path d='M37.3 20 40 23 42.7 20' />
    </svg>
  )
}

/** The reverse — every task's Archive converging back into the one
 * tranche close-out. */
function FanIn() {
  return (
    <svg viewBox='0 0 80 28' {...CONNECTOR_FRAME} className='h-7 w-20 text-muted-foreground'>
      <path d='M20 5 40 23M40 5 40 23M60 5 40 23' />
      <path d='M37.3 20 40 23 42.7 20' />
      <circle cx='40' cy='24.5' r='2.2' fill='currentColor' stroke='none' />
    </svg>
  )
}

/** The loop closing — a decorative curve down the left margin from Wrap-up
 * back up to Plan. Purely an enhancement on wider screens; the `RotateCcw`
 * row below always carries the same claim in words, so the loop reads even
 * where there's no margin for the curve. */
function ReturnEdge() {
  return (
    <svg
      viewBox='0 0 40 100'
      preserveAspectRatio='none'
      {...CONNECTOR_FRAME}
      className='-left-12 pointer-events-none absolute inset-y-0 hidden h-full w-10 text-muted-foreground sm:block'
    >
      <path d='M10 92Q-8 50 10 8' vectorEffect='non-scaling-stroke' />
      <path d='M6 14 10 8 15 13' vectorEffect='non-scaling-stroke' />
    </svg>
  )
}

export function LoopComposition() {
  return (
    <div className='relative mx-auto flex max-w-2xl flex-col items-center gap-6 py-4'>
      <ReturnEdge />

      <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
        Plan
      </Text>
      <StageTile id='plan' />

      <FanOut />

      <div className='w-full rounded-lg border border-border bg-card p-5'>
        <Text as='p' size='xs' muted className='mb-4 text-center font-mono uppercase tracking-widest'>
          Every task in the tranche, in parallel
        </Text>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <StageTile id='brief' />
          <StepArrow />
          <StageTile id='develop' />
          <StepArrow />
          <div className='flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-3'>
            <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
              Same pull request
            </Text>
            <div className='flex items-center gap-3'>
              <StageTile id='review' />
              <StageTile id='security' />
            </div>
          </div>
          <StepArrow />
          <StageTile id='archive' />
        </div>
      </div>

      <FanIn />

      <Text as='span' size='xs' muted className='font-mono uppercase tracking-widest'>
        Wrap up
      </Text>
      <StageTile id='wrap-up' />

      <NextLink
        href='/start/plan'
        variant='unstyled'
        className='mt-2 inline-flex items-center gap-2 text-primary text-sm underline-offset-4 hover:underline'
      >
        <RotateCcw className='size-4' aria-hidden />
        <span>Back into planning the next tranche</span>
      </NextLink>
    </div>
  )
}
