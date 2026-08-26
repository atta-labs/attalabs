'use client'

import { useEffect, useRef, useState } from 'react'
import type { LifeCycleId } from '../_lib/life-cycles'
import { LIFE_CYCLES } from '../_lib/life-cycles'

const HOLD_MS = 1300
const MORPH_MS = 900
const PEAK_PX = 16
const TRAVEL_CYCLES = 2
const SCROLL_AWAY_PX = 24
const SCROLL_TOP_PX = 4

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

function labelFor(id: LifeCycleId) {
  return LIFE_CYCLES.find((cycle) => cycle.id === id)?.label ?? id
}

function applyWave(letters: (HTMLSpanElement | null)[], t: number) {
  const count = letters.length
  const amplitude = Math.sin(Math.PI * t) * PEAK_PX
  for (let i = 0; i < count; i++) {
    const el = letters[i]
    if (!el) continue
    const travel = (i / Math.max(1, count - 1)) * Math.PI * 2 - t * Math.PI * 2 * TRAVEL_CYCLES
    const y = amplitude * Math.sin(travel)
    el.style.transform = `translateY(${y}px)`
  }
}

// Same "find the nearest scrolling ancestor" pattern `LifeCycleSwitcher.tsx`
// and `LandingInteractions.tsx`'s `RevealGrid` use — this app's scroll
// container is a `.overflow-y-auto` div in `(site)/layout.tsx`, never `window`.
function scrollParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement
  while (parent) {
    const overflow = window.getComputedStyle(parent).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return parent
    parent = parent.parentElement
  }
  return window
}

function scrollY(target: HTMLElement | Window): number {
  return target instanceof Window ? window.scrollY : target.scrollTop
}

// Real letters, our own type scale — no canvas, no filter noise. Before the
// reader ever touches the switcher below, this plays through all three
// altitudes ONCE and holds on the last one — an ambient hero flourish, not a
// forever-looping distraction. Scrolling away and back to the very top
// replays it once more, since arriving back at the top reads as a fresh
// view of the hero. The instant the reader clicks a real tab, it locks onto
// the switcher's actual active altitude and never plays on its own again,
// so it can't go on showing a word that contradicts the switcher once the
// switcher is a real, chosen state. A traveling sine wave carries every
// transition; the word swaps at the wave's peak displacement (already
// unreadable), the same wave carrying the new word's letters down flat —
// the wave doesn't fade the word away, it becomes it.
export function LifeCycleWordFlow({ active, interacted }: { active: LifeCycleId; interacted: boolean }) {
  const [displayed, setDisplayed] = useState<LifeCycleId>(active)
  const [playToken, setPlayToken] = useState(0)
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const prevActive = useRef(active)
  const wasInteracted = useRef(interacted)

  // Ambient auto-cycle, only before the reader has touched a real tab: one
  // full pass through every altitude, then holds on the last.
  useEffect(() => {
    if (interacted) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let index = 0
    let step = 0
    let phase: 'hold' | 'morph' = 'hold'
    let phaseStart = performance.now()
    let swapped = false

    const draw = (now: number) => {
      const elapsed = now - phaseStart

      if (phase === 'hold' || reduced) {
        applyWave(letterRefs.current, 0)
        if (elapsed >= HOLD_MS) {
          if (step >= LIFE_CYCLES.length - 1) return
          if (reduced) {
            step += 1
            index = (index + 1) % LIFE_CYCLES.length
            const next = LIFE_CYCLES[index]
            if (next) setDisplayed(next.id)
          } else {
            phase = 'morph'
            swapped = false
          }
          phaseStart = now
        }
      } else {
        const t = Math.min(1, elapsed / MORPH_MS)
        applyWave(letterRefs.current, easeInOut(t))
        if (!swapped && t >= 0.5) {
          swapped = true
          step += 1
          index = (index + 1) % LIFE_CYCLES.length
          const next = LIFE_CYCLES[index]
          if (next) setDisplayed(next.id)
        }
        if (t >= 1) {
          phase = 'hold'
          phaseStart = now
        }
      }

      frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [interacted, playToken])

  // Scrolling away from the top and back replays the ambient pass, as long
  // as the reader still hasn't touched a real tab.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const target = scrollParent(el)
    let hasLeftTop = false
    let frame = 0

    const evaluate = () => {
      frame = 0
      const y = scrollY(target)
      if (y > SCROLL_AWAY_PX) {
        hasLeftTop = true
        return
      }
      if (hasLeftTop && y <= SCROLL_TOP_PX) {
        hasLeftTop = false
        if (!interacted) {
          setDisplayed(LIFE_CYCLES[0]?.id ?? active)
          setPlayToken((token) => token + 1)
        }
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(evaluate)
    }
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      target.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [interacted, active])

  // Once the reader has touched a real tab, lock onto the switcher's actual
  // active altitude and morph to it on every subsequent change.
  useEffect(() => {
    if (!interacted) {
      prevActive.current = active
      return
    }

    const justInteracted = !wasInteracted.current
    wasInteracted.current = true
    if (!justInteracted && active === prevActive.current) return
    prevActive.current = active

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplayed(active)
      return
    }

    let frame = 0
    let swapped = false
    const start = performance.now()

    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / MORPH_MS)
      applyWave(letterRefs.current, easeInOut(t))
      if (!swapped && t >= 0.5) {
        swapped = true
        setDisplayed(active)
      }
      if (t < 1) frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [active, interacted])

  const word = labelFor(displayed)
  letterRefs.current = []

  return (
    <div ref={containerRef} className='flex h-16 items-center justify-center sm:h-20'>
      <p className='flex font-mono text-3xl font-normal tracking-tight text-foreground sm:text-4xl'>
        {word.split('').map((letter, i) => (
          <span
            key={i}
            ref={(el) => {
              letterRefs.current[i] = el
            }}
            className='inline-block will-change-transform'
          >
            {letter}
          </span>
        ))}
      </p>
    </div>
  )
}
