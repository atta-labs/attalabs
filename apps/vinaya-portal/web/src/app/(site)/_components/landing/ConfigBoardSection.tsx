'use client'

import { Code } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LetterReveal } from '../LetterReveal'
import { LandingSection } from './LandingSection'
import { SectionOverline, SectionTitle } from './SectionHeading'

type Row = {
  label: string
  solid: number
  dashed: number
}

// Bar counts match the reference design 1:1 — not arbitrary, this is the
// actual "ours becomes yours" shape per row.
const ROWS: readonly Row[] = [
  { label: 'AGENTS', solid: 4, dashed: 2 },
  { label: 'CHECKS', solid: 3, dashed: 3 },
  { label: 'ROLES', solid: 5, dashed: 1 },
  { label: 'GATES', solid: 7, dashed: 2 }
]

// Per-dashed-bar transition delay, staggered so they spring in one after
// another rather than all at once — matches the reference exactly.
const BAR_DELAYS = ['delay-[100ms]', 'delay-[160ms]', 'delay-[220ms]'] as const

// Steps 0–4 walk the four rows on in sequence, 5–6 hold the resolved state,
// then it resets to 0 and repeats. The resting markup (step 6, everything
// on) is what renders pre-JS and under reduced motion — the section is
// correct with the loop never having run.
const STEP_MS = 700

function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

export function ConfigBoardSection() {
  const boardRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(6)

  useEffect(() => {
    const board = boardRef.current
    if (!board || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const target = scrollParent(board)
    let interval = 0

    const evaluate = () => {
      const rect = board.getBoundingClientRect()
      const visible = rect.top < window.innerHeight * 0.9 && rect.bottom > window.innerHeight * 0.1
      if (visible && !interval) {
        interval = window.setInterval(() => setStep((s) => (s >= 6 ? 0 : s + 1)), STEP_MS)
      } else if (!visible && interval) {
        window.clearInterval(interval)
        interval = 0
      }
    }
    // Scroll/resize listeners alone can miss the first crossing when the
    // scroll happens on a nested container this effect attaches to after
    // that scroll already settled — the poll is what actually catches it.
    const observer = new IntersectionObserver(evaluate, {
      root: target instanceof Window ? null : target,
      threshold: [0, 0.1, 0.9]
    })
    observer.observe(board)
    target.addEventListener('scroll', evaluate, { passive: true })
    window.addEventListener('resize', evaluate)
    const poll = window.setInterval(evaluate, 250)
    evaluate()
    return () => {
      observer.disconnect()
      target.removeEventListener('scroll', evaluate)
      window.removeEventListener('resize', evaluate)
      window.clearInterval(poll)
      if (interval) window.clearInterval(interval)
    }
  }, [])

  return (
    <LandingSection background='bg-background text-foreground'>
      <div className='grid gap-12 text-center md:grid-cols-2 md:items-center md:gap-16 md:text-left'>
        <div>
          <NextLink href='/config' variant='unstyled'>
            <Code className='bg-foreground/10 px-3 py-1.5 text-lg font-bold text-foreground transition-colors hover:bg-foreground/15 sm:text-xl'>
              vinaya.config.json
            </Code>
          </NextLink>
          <SectionOverline className='mt-6 text-muted-foreground'>configure your process</SectionOverline>
          <SectionTitle className='mt-3'>
            <LetterReveal text='One file' />
            <br />
            <span className='text-muted-foreground'>
              <LetterReveal text='Your whole harness' startIndex={9} />
            </span>
          </SectionTitle>
          <Text className='mt-7 max-w-md text-xl leading-relaxed text-muted-foreground'>
            Define your gates. Your checks. Extend the agents you already use. Ours ships as the default — nothing you
            add or replace ever touches a second file.
          </Text>
          <NextLink
            href='/config'
            variant='unstyled'
            className='mt-6 inline-flex items-center gap-2 border-b border-current pb-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em]'
          >
            Configuration <ArrowRight className='size-3.5' />
          </NextLink>
        </div>

        <div ref={boardRef}>
          <div className='flex flex-col'>
            {ROWS.map((row, index) => {
              const on = step > index
              return (
                <div
                  key={row.label}
                  className='flex items-baseline justify-between gap-6 border-t border-border py-6 text-left last:border-b'
                >
                  <div className='flex items-baseline font-mono text-2xl font-medium sm:text-3xl lg:text-4xl'>
                    <span
                      className={`inline-block overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-500 ${
                        on ? 'max-w-[6ch] opacity-100' : 'max-w-0 opacity-0'
                      }`}
                    >
                      YOUR{' '}
                    </span>
                    <span>{row.label}</span>
                  </div>
                  <div className='flex flex-none items-center gap-1.5'>
                    {Array.from({ length: row.solid }, (_, i) => (
                      <span key={`solid-${i}`} className='h-6 w-2 shrink-0 rounded-sm bg-foreground' />
                    ))}
                    {Array.from({ length: row.dashed }, (_, i) => (
                      <span
                        key={`dashed-${i}`}
                        className={`h-6 w-2 shrink-0 rounded-sm border-2 border-dashed border-foreground transition-[opacity,transform] duration-500 ${
                          BAR_DELAYS[i] ?? ''
                        } ${on ? 'translate-x-0 opacity-100' : '-translate-x-2.5 opacity-0'}`}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className='mt-6 flex justify-center gap-7 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground md:justify-end'>
            <span className='flex items-center gap-2'>
              <span className='h-2.5 w-5 rounded-sm bg-foreground' />
              ships with vinaya
            </span>
            <span className='flex items-center gap-2'>
              <span className='h-2.5 w-5 rounded-sm border-2 border-dashed border-foreground' />
              yours
            </span>
          </div>
        </div>
      </div>
    </LandingSection>
  )
}
