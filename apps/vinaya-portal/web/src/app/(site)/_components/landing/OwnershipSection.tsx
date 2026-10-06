'use client'

import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { GitMerge } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { useEnterProgress, usePinEnabled, usePinProgress } from './LandingInteractions'
import { SectionTitle } from './SectionHeading'
import { UnderlineLink } from './UnderlineLink'

// 03 · The checks. A vertical pipeline from the agent's work to the merge: a fill line grows
// with scroll and each row lights as it reaches it. Pinned (200vh) on a roomy viewport, a
// flowing centered section otherwise. There is no merge badge and no cards: the last row's purple
// chip is the merge.

type CheckRow = { label: string; title: string; chip: ReactNode; chipClass: string }

const CHIP_BASE =
  'inline-flex items-center gap-[0.35rem] justify-self-start whitespace-nowrap rounded-sm border px-[0.7rem] py-[0.4rem] font-mono text-sm transition-[opacity,transform] duration-[400ms] motion-reduce:transition-none'

const ROWS: readonly CheckRow[] = [
  {
    label: 'the agent',
    title: 'The agent writes',
    chip: (
      <>
        code <b className='text-success'>+203</b> <b className='text-destructive'>−67</b>
      </>
    ),
    chipClass: 'border-foreground bg-card'
  },
  {
    label: 'ring 0 · hooks · your machine',
    title: 'Catch problems before you push or open a PR',
    chip: '✓ commit · push · PR opens',
    chipClass: 'border-foreground bg-card'
  },
  {
    label: 'ring 1 · branch rules · ci',
    title: 'Hold the merge until the PR passes',
    chip: '✓ PR #473 · ready for your approval',
    chipClass: 'border-success text-success'
  },
  {
    label: 'ring 2 · audits · after merge',
    title: 'Surface drift after merge',
    chip: (
      <>
        <GitMerge className='size-3 shrink-0' />
        merged · audited
      </>
    ),
    // A merged pull request is purple on GitHub; the nearest existing theme token is the third chart colour.
    chipClass: 'border-chart-3 text-chart-3'
  }
]

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

// One piece of the line between two circles, centred in the circle column; `fill` of it is lit.
function Segment({ hidden, fill, className }: { hidden: boolean; fill: number; className: string }) {
  return (
    <span
      aria-hidden='true'
      className={cn('col-start-1 mx-auto block h-full w-0.5 bg-border', hidden && 'invisible', className)}
    >
      <span className='block w-full bg-foreground' style={{ height: `${fill * 100}%` }} />
    </span>
  )
}

export function OwnershipSection() {
  const ref = useRef<HTMLElement>(null)
  const pinned = usePinEnabled()
  const pinProgress = usePinProgress(ref)
  const enterProgress = useEnterProgress(ref, 0.7, 0.6)
  const progress = pinned ? pinProgress : enterProgress
  const fill = Math.max(0, Math.min(1, (progress - 0.06) / 0.8))

  return (
    <section ref={ref} className={cn('relative bg-secondary text-secondary-foreground', pinned && 'h-[200vh]')}>
      <div className={cn('flex items-center', pinned ? 'sticky top-0 min-h-screen' : 'relative')}>
        <div
          className={cn(
            'mx-auto flex w-full max-w-[73.75rem] flex-row-reverse flex-wrap items-center gap-12 px-6 sm:px-10',
            pinned ? 'pb-6 pt-20' : 'py-14'
          )}
        >
          <div
            className={cn(
              'flex min-w-0 flex-[1_1_22rem] flex-col',
              pinned ? 'gap-6 text-left' : 'items-center gap-2.5 text-center'
            )}
          >
            <SectionTitle size='compact'>Control what actually merges</SectionTitle>
            <Text className='text-2xl leading-snug sm:text-[1.75rem]'>
              Your checks, from local work to merge.{' '}
              <span className='text-muted-foreground'>Yours sit beside ours.</span>
            </Text>
            <div className={pinned ? 'self-start' : 'self-center'}>
              <UnderlineLink href='/docs/rings'>How the rings work</UnderlineLink>
            </div>
          </div>
          <div className='flex min-w-0 flex-[1_1_22rem] flex-col'>
            {ROWS.map((row, index) => {
              const on = progress >= 0.06 && fill >= index / 3 - 0.001
              const last = index === ROWS.length - 1
              // The line between two circles is drawn in two pieces, one in each row (the bottom of
              // the upper row, the top of the lower one), and the fill runs through the first and
              // then the second as scroll carries it from one circle to the next.
              const toThis = clamp01(3 * fill - (index - 1))
              const fromThis = clamp01(3 * fill - index)
              return (
                <div
                  key={row.label}
                  className='grid grid-cols-[3rem_minmax(0,1fr)] grid-rows-[auto_auto_auto] gap-x-[1.1rem]'
                >
                  <Segment hidden={index === 0} fill={clamp01(2 * toThis - 1)} className='row-start-1' />
                  <span
                    className={cn(
                      'col-start-1 row-start-2 grid size-12 place-items-center rounded-full border-2 border-foreground font-mono text-base transition-[background-color,color] duration-300 motion-reduce:transition-none',
                      on ? 'bg-foreground text-secondary' : 'bg-secondary text-foreground'
                    )}
                  >
                    {on ? '✓' : index + 1}
                  </span>
                  <Segment hidden={last} fill={clamp01(2 * fromThis)} className='row-start-3' />
                  <div
                    className={cn(
                      'col-start-2 row-start-1 flex items-end pb-1 transition-opacity duration-[400ms] motion-reduce:transition-none',
                      on ? 'opacity-100' : 'opacity-40'
                    )}
                  >
                    <span className='font-mono text-sm uppercase tracking-[0.02em] text-muted-foreground'>
                      {row.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'col-start-2 row-start-2 self-center text-[clamp(1.25rem,1.9vw,1.625rem)] leading-tight tracking-[-0.02em] transition-opacity duration-[400ms] motion-reduce:transition-none',
                      on ? 'opacity-100' : 'opacity-40'
                    )}
                  >
                    {row.title}
                  </span>
                  <div className={cn('col-start-2 row-start-3 flex items-start pt-2', !last && 'pb-6')}>
                    <span
                      className={cn(
                        CHIP_BASE,
                        row.chipClass,
                        on ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
                      )}
                    >
                      {row.chip}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
