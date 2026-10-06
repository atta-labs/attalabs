'use client'

import { Button } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowDown, ArrowUpRight, Check, Copy, Terminal } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { enterProgress, pinFits, pinProgress } from './pin-math'

function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

// One shared ticker for every measuring hook on the page: a single capture-phase scroll listener
// (the scroll parent is not `window` here — `SiteContentPad` is the `h-dvh overflow-y-auto`
// container — and a capture listener on `document` sees scrolls from any element), one resize
// listener and one 250ms poll for layout shifts neither event reports. Subscribers run together in
// one rAF, so adding a section adds no timer.
const subscribers = new Set<() => void>()
let stopTicker: (() => void) | undefined

function startTicker() {
  let animationFrame = 0
  const run = () => {
    animationFrame = 0
    for (const subscriber of subscribers) subscriber()
  }
  const queue = () => {
    if (!animationFrame) animationFrame = requestAnimationFrame(run)
  }
  document.addEventListener('scroll', queue, { passive: true, capture: true })
  window.addEventListener('resize', queue)
  const poll = window.setInterval(queue, 250)
  return () => {
    document.removeEventListener('scroll', queue, { capture: true })
    window.removeEventListener('resize', queue)
    window.clearInterval(poll)
    cancelAnimationFrame(animationFrame)
  }
}

function subscribe(subscriber: () => void) {
  subscribers.add(subscriber)
  if (subscribers.size === 1) stopTicker = startTicker()
  return () => {
    subscribers.delete(subscriber)
    if (subscribers.size === 0) {
      stopTicker?.()
      stopTicker = undefined
    }
  }
}

function useScrollMeasure(ref: RefObject<HTMLElement | null> | null, measure: (element: HTMLElement | null) => void) {
  const latest = useRef(measure)
  latest.current = measure

  useEffect(() => {
    const element = ref?.current ?? null
    const run = () => latest.current(element)
    run()
    return subscribe(run)
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
    setEnabled(pinFits(window.innerWidth, window.innerHeight))
  })
  return enabled && !reduced
}

function useProgress(ref: RefObject<HTMLElement | null>, compute: (bounds: DOMRect, viewport: number) => number) {
  const [progress, setProgress] = useState(0)
  const reduced = useReducedMotion()
  useScrollMeasure(ref, (element) => {
    if (!element) return
    const next = compute(element.getBoundingClientRect(), window.innerHeight || 800)
    setProgress((previous) => (Math.abs(next - previous) > 0.003 ? next : previous))
  })
  return reduced ? 1 : progress
}

/**
 * 0..1 progress of a pinned section: 0 when its top hits the viewport top, 1 when its bottom hits
 * the viewport bottom. Reads 1 under reduced motion, so a section renders its final state.
 */
export function usePinProgress(ref: RefObject<HTMLElement | null>): number {
  return useProgress(ref, (bounds, viewport) => pinProgress(bounds.top, bounds.height, viewport))
}

/**
 * 0..1 progress for a flowing section entering the viewport: starts when its top crosses
 * `start` of the viewport height, completes after `span` viewport heights of further scroll.
 */
export function useEnterProgress(ref: RefObject<HTMLElement | null>, start = 0.9, span = 0.6): number {
  return useProgress(ref, (bounds, viewport) => enterProgress(bounds.top, viewport, start, span))
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

// A terminal-styled, click-to-copy command: `$ <command>` in a box that stays dark in both colour
// schemes without a literal colour (the foreground ink as a fill in light, the card surface in dark).
// A plain <button>, not `@atta/ui`'s: the `animate` library's Button scales on hover and on tap, and this
// box has to stay perfectly still, with no hover treatment of any kind.
export function TerminalCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type='button'
      onClick={copy}
      aria-label={`Copy ${command}`}
      className='flex max-w-full cursor-pointer items-center gap-4 rounded-lg border border-border bg-foreground px-7 py-5 text-left font-mono text-[length:clamp(1rem,1.9vw,1.375rem)] leading-none text-background outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-card dark:text-card-foreground'
    >
      <Terminal className='size-[1.1em] shrink-0 text-success' />
      <span className='text-background/60 dark:text-muted-foreground'>$</span>
      <span className='min-w-0 whitespace-normal [overflow-wrap:anywhere]'>{command}</span>
      {copied ? (
        <Check className='size-[1.1em] shrink-0' />
      ) : (
        <Copy className='size-[1.1em] shrink-0 text-background/60 dark:text-muted-foreground' />
      )}
    </button>
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
        className='inline-flex items-center gap-1.5 font-mono text-base uppercase tracking-[0.04em] text-muted-foreground'
      >
        {label}
        <ArrowUpRight className='size-4 shrink-0' />
      </NextLink>
      <TerminalCommand command={command} />
    </div>
  )
}
