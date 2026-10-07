import { findScrollParent } from './scroll-signal'

// The roadmap's shared "rest" state — one small module the cue, the pad screen and the
// idle motion in `DeploymentTrack` all read, so they hand over together. Cosmetic only:
// it never touches `deployment-progress.ts`, and it is a function of scroll position plus
// a short success beat, not of the install geometry.
//
//   idle    — at the top; the sign types, the cue and the idle motion are on (rest = 1)
//   success — first scroll past 70px: the sign types a success line and holds it
//   gone    — the success hold is over: the cue and the idle motion fade (rest 1 -> 0, 500ms)
//
// Back above 20px returns to `idle` (rest 0 -> 1 over 400ms). The tween is the design's
// `1 - (1 - p)^3` ease-out. Under reduced motion the tweens are instant and the pad
// screen skips its success line.
export type RestPhase = 'idle' | 'success' | 'gone'
export type RestEvent = { rest: number; phase: RestPhase }

const START_PX = 70
const BACK_PX = 20
const SUCCESS_FALLBACK_MS = 4000 // if no pad screen ends the success beat, end it anyway

let phase: RestPhase = 'idle'
let from = 1
let to = 1
let t0 = 0
let dur = 1
let reduce = false
let refs = 0
let teardown: (() => void) | null = null
let fallbackTimer = 0
let raf = 0
const subs = new Set<(e: RestEvent) => void>()

export function getRest(now: number = performance.now()): number {
  const p = Math.min(1, (now - t0) / dur)
  return from + (to - from) * (1 - (1 - p) ** 3)
}

export function getPhase(): RestPhase {
  return phase
}

function emit() {
  const e = { rest: getRest(), phase }
  for (const fn of subs) fn(e)
}

function pump() {
  if (raf) return
  const step = () => {
    raf = 0
    emit()
    if (performance.now() - t0 < dur) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

function setRest(next: number, ms: number) {
  from = getRest()
  to = next
  t0 = performance.now()
  dur = Math.max(1, reduce ? 1 : ms)
  pump()
}

export function subscribe(fn: (e: RestEvent) => void): () => void {
  subs.add(fn)
  return () => {
    subs.delete(fn)
  }
}

// The pad screen calls this when its success line has been shown and held.
export function finishSuccess() {
  if (phase !== 'success') return
  window.clearTimeout(fallbackTimer)
  phase = 'gone'
  setRest(0, 500)
  emit()
}

// Start watching the page's scroller (reference counted: the first attach does the work).
export function attach(el: HTMLElement): () => void {
  refs += 1
  if (refs === 1) {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scroller = findScrollParent(el)
    const target: HTMLElement | Window = scroller ?? window
    const read = () => (scroller ? scroller.scrollTop : document.documentElement.scrollTop)
    const evaluate = () => {
      const s = read()
      if (phase === 'idle' && s > START_PX) {
        phase = 'success'
        fallbackTimer = window.setTimeout(finishSuccess, SUCCESS_FALLBACK_MS)
        emit()
      } else if (phase !== 'idle' && s < BACK_PX) {
        window.clearTimeout(fallbackTimer)
        phase = 'idle'
        setRest(1, 400)
        emit()
      }
    }
    // Arriving already scrolled (restored position): skip straight to the faded state.
    if (read() > START_PX) {
      phase = 'gone'
      from = 0
      to = 0
    } else {
      phase = 'idle'
      from = 1
      to = 1
    }
    t0 = performance.now() - 10_000
    target.addEventListener('scroll', evaluate, { passive: true })
    teardown = () => {
      target.removeEventListener('scroll', evaluate)
      window.clearTimeout(fallbackTimer)
      cancelAnimationFrame(raf)
      raf = 0
    }
  }
  return () => {
    refs -= 1
    if (refs === 0) {
      teardown?.()
      teardown = null
      phase = 'idle'
      from = 1
      to = 1
    }
  }
}
