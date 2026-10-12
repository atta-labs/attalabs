'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'
import { enterProgress, pinFits, pinProgress } from './pin-math'

// Copied from Vinaya Portal's landing (`_components/landing/LandingInteractions.tsx`).
// One shared ticker for every measuring hook on the page: a single capture-phase scroll listener
// (a capture listener on `document` sees the window's scroll and any element's), one resize
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
