'use client'

import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { GitMerge } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { LetterReveal } from '../LetterReveal'
import { useEnterProgress, usePinEnabled, usePinProgress } from './LandingInteractions'
import { SectionTitle } from './SectionHeading'
import { UnderlineLink } from './UnderlineLink'

// 03 · The checks. A vertical pipeline from the agent's work to the merge: a fill line grows
// with scroll and each row lights as it reaches it. Pinned (200vh) on a roomy viewport, a
// flowing centered section otherwise.

type CheckRow = { label: string; title: string; chip: ReactNode; chipClass: string }

const CHIP_BASE =
  'inline-flex items-center gap-[0.35rem] justify-self-start whitespace-nowrap rounded-sm border px-[0.55rem] py-[0.3rem] font-mono text-[0.625rem] transition-[opacity,transform] duration-[400ms] motion-reduce:transition-none'

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
    chipClass: 'border-primary text-primary'
  }
]

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
        <div className='mx-auto flex w-full max-w-[73.75rem] flex-row-reverse flex-wrap items-center gap-12 px-6 py-14 sm:px-10'>
          <div
            className={cn(
              'flex min-w-0 flex-[1_1_22rem] flex-col',
              pinned ? 'gap-6 text-left' : 'items-center gap-2.5 text-center'
            )}
          >
            <SectionTitle size='compact'>
              <LetterReveal text='Control what actually merges' />
            </SectionTitle>
            <Text className='text-xl leading-snug'>
              Your checks, from local work to merge.{' '}
              <span className='text-muted-foreground'>Yours sit beside ours.</span>
            </Text>
            <div className={pinned ? 'self-start' : 'self-center'}>
              <UnderlineLink href='/docs/rings'>How the rings work</UnderlineLink>
            </div>
          </div>
          <div className='flex min-w-0 flex-[1_1_22rem] flex-col gap-5'>
            <div className='relative grid auto-rows-fr gap-4'>
              <div
                aria-hidden='true'
                className='absolute left-[calc(1.25rem_-_1px)] top-[calc((100%_-_3rem)_/_8_+_0.6rem)] bottom-[calc((100%_-_3rem)_/_8_-_0.6rem)] w-0.5 bg-border'
              >
                <div className='w-full bg-foreground' style={{ height: `${fill * 100}%` }} />
              </div>
              {ROWS.map((row, index) => {
                const on = progress >= 0.06 && fill >= index / 3 - 0.001
                return (
                  <div
                    key={row.label}
                    className='grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-[1.1rem] gap-y-2'
                  >
                    <span
                      className={cn(
                        'relative z-10 -mb-[0.6rem] grid size-10 place-items-center self-end rounded-full border-2 border-foreground font-mono text-[0.85rem] transition-[background-color,color] duration-300 motion-reduce:transition-none',
                        on ? 'bg-foreground text-secondary' : 'bg-secondary text-foreground'
                      )}
                    >
                      {on ? '✓' : index + 1}
                    </span>
                    <div
                      className={cn(
                        'flex min-w-0 flex-col gap-[0.3rem] transition-opacity duration-[400ms] motion-reduce:transition-none',
                        on ? 'opacity-100' : 'opacity-40'
                      )}
                    >
                      <span className='font-mono text-[0.625rem] uppercase tracking-[0.02em] text-muted-foreground'>
                        {row.label}
                      </span>
                      <span className='text-lg leading-tight tracking-[-0.02em]'>{row.title}</span>
                    </div>
                    <span
                      className={cn(
                        CHIP_BASE,
                        'col-start-2',
                        row.chipClass,
                        on ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'
                      )}
                    >
                      {row.chip}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
