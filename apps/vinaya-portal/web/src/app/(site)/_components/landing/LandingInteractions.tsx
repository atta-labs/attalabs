'use client'

import { Button } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowDown, ArrowUpRight, Check, Copy, Terminal } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

/** Pinned (sticky, scroll-scrubbed) layouts only run on a roomy viewport; below it every section flows. */
export const PIN_MIN_WIDTH = 1000
export const PIN_MIN_HEIGHT = 620

/**
 * Calls `measure` on every scroll (rAF-throttled), resize and a 250ms poll. The scroll parent is
 * not `window` here (`SiteContentPad` is the `h-dvh overflow-y-auto` container), so the listener
 * goes on the nearest scrolling ancestor; the poll catches layout shifts neither event reports.
 */
function useScrollMeasure(ref: RefObject<HTMLElement | null> | null, measure: (element: HTMLElement | null) => void) {
  const latest = useRef(measure)
  latest.current = measure

  useEffect(() => {
    const element = ref?.current ?? null
    const target = element ? scrollParent(element) : window
    let animationFrame = 0
    const run = () => {
      animationFrame = 0
      latest.current(element)
    }
    const queue = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(run)
    }
    target.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    const poll = window.setInterval(queue, 250)
    run()
    return () => {
      target.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      window.clearInterval(poll)
      cancelAnimationFrame(animationFrame)
    }
  }, [ref])
}

/** `prefers-reduced-motion: reduce`. False on the server and first paint, then the real value. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

/**
 * Whether pinned behaviour is on: `innerWidth >= 1000 && innerHeight >= 620`, and never under
 * reduced motion (those readers get the flowing layout with every section in its final state).
 */
export function usePinEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)
  const reduced = useReducedMotion()
  useScrollMeasure(null, () => {
    setEnabled(window.innerWidth >= PIN_MIN_WIDTH && window.innerHeight >= PIN_MIN_HEIGHT)
  })
  return enabled && !reduced
}

function useProgress(ref: RefObject<HTMLElement | null>, compute: (bounds: DOMRect, viewport: number) => number) {
  const [progress, setProgress] = useState(0)
  const reduced = useReducedMotion()
  useScrollMeasure(ref, (element) => {
    if (!element) return
    const next = clamp01(compute(element.getBoundingClientRect(), window.innerHeight || 800))
    setProgress((previous) => (Math.abs(next - previous) > 0.003 ? next : previous))
  })
  return reduced ? 1 : progress
}

/**
 * 0..1 progress of a pinned section: 0 when its top hits the viewport top, 1 when its bottom hits
 * the viewport bottom. Reads 1 under reduced motion, so a section renders its final state.
 */
export function usePinProgress(ref: RefObject<HTMLElement | null>): number {
  return useProgress(ref, (bounds, viewport) => -bounds.top / Math.max(1, bounds.height - viewport))
}

/**
 * 0..1 progress for a flowing section entering the viewport: starts when its top crosses
 * `start` of the viewport height, completes after `span` viewport heights of further scroll.
 */
export function useEnterProgress(ref: RefObject<HTMLElement | null>, start = 0.9, span = 0.6): number {
  return useProgress(ref, (bounds, viewport) => (viewport * start - bounds.top) / (viewport * span))
}

/** One-shot: true once the element's top has crossed `threshold` of the viewport height (true under reduced motion). */
export function useSeen(ref: RefObject<HTMLElement | null>, threshold = 0.8): boolean {
  const [seen, setSeen] = useState(false)
  const reduced = useReducedMotion()
  useScrollMeasure(ref, (element) => {
    if (element && element.getBoundingClientRect().top < (window.innerHeight || 800) * threshold) setSeen(true)
  })
  return seen || reduced
}

/** Below this width the stacked variants kick in (`⇅` instead of `⇄`, Studio's step list collapses). */
export const NARROW_WIDTH = 820

export function useViewportHeight(): number {
  const [height, setHeight] = useState(800)
  useScrollMeasure(null, () => setHeight(window.innerHeight || 800))
  return height
}

export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false)
  useScrollMeasure(null, () => setNarrow(window.innerWidth < NARROW_WIDTH))
  return narrow
}

export function RevealGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const target = scrollParent(element)
    let animationFrame = 0

    const evaluate = () => {
      animationFrame = 0
      const bounds = element.getBoundingClientRect()
      if (bounds.top < window.innerHeight * 0.85 && bounds.bottom > 0) setVisible(true)
      else if (bounds.top >= window.innerHeight * 0.85) setVisible(false)
    }
    const queue = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(evaluate)
    }
    const observer = new IntersectionObserver(queue, {
      root: target instanceof Window ? null : target,
      threshold: [0, 0.05]
    })
    observer.observe(element)
    target.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    const poll = window.setInterval(queue, 250)
    evaluate()
    return () => {
      observer.disconnect()
      target.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      window.clearInterval(poll)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <div ref={ref} data-visible={visible} className={`group/reveal ${className}`}>
      {children}
    </div>
  )
}

export function ScrollToSectionButton({ targetId, children }: { targetId: string; children: ReactNode }) {
  return (
    <Button
      type='button'
      size='lg'
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
      className='font-mono text-xs uppercase tracking-[0.16em]'
    >
      {children}
      <ArrowDown className='size-4' />
    </Button>
  )
}

export function CommandCopy({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button
      type='button'
      variant='outline'
      onClick={copy}
      className='h-auto max-w-full gap-4 rounded-lg py-2.5 pl-5 pr-3 font-mono text-sm shadow-none sm:text-base'
    >
      <span className='min-w-0 whitespace-normal text-left [overflow-wrap:anywhere]'>{command}</span>
      <span className='flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted-foreground'>
        {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
        {copied ? 'copied' : 'copy'}
      </span>
    </Button>
  )
}

// A terminal-styled, click-to-copy command: `$ <command>` in an inverted (foreground-on-background)
// box so it reads as a terminal in both colour schemes without a literal colour.
export function TerminalCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button
      type='button'
      variant='outline'
      onClick={copy}
      aria-label={`Copy ${command}`}
      className='h-auto max-w-full gap-3 rounded-lg border-border bg-foreground px-5 py-4 font-mono text-[0.8125rem] text-background shadow-none hover:bg-foreground hover:text-background'
    >
      <Terminal className='size-4 shrink-0 text-success' />
      <span className='text-background/60'>$</span>
      <span className='min-w-0 whitespace-normal text-left [overflow-wrap:anywhere]'>{command}</span>
      {copied ? <Check className='size-4 shrink-0' /> : <Copy className='size-4 shrink-0 text-background/60' />}
    </Button>
  )
}

// The zero-lock-in pair: a label linking to the command's docs page above a terminal-styled copy box,
// so the copy target and the reference stay one tap apart.
export function LabeledCommandCopy({ href, label, command }: { href: string; label: string; command: string }) {
  return (
    <div className='flex w-full min-w-0 max-w-full flex-col items-center gap-2.5 min-[820px]:w-auto'>
      <NextLink
        href={href}
        variant='unstyled'
        className='inline-flex items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.02em] text-muted-foreground transition-colors hover:text-foreground'
      >
        {label}
        <ArrowUpRight className='size-3 shrink-0' />
      </NextLink>
      <TerminalCommand command={command} />
    </div>
  )
}
