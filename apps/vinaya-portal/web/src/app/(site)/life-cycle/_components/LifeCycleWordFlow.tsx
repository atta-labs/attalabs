'use client'

import { useEffect, useRef, useState } from 'react'
import type { LifeCycleId } from '../_lib/life-cycles'
import { LIFE_CYCLES } from '../_lib/life-cycles'

const MORPH_MS = 900
const PEAK_PX = 16
const TRAVEL_CYCLES = 2

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

function labelFor(id: LifeCycleId) {
  return LIFE_CYCLES.find((cycle) => cycle.id === id)?.label ?? id
}

// Real letters, our own type scale — no canvas, no filter noise. Driven by
// the switcher's actual `active` altitude below, not an independent timer —
// this word IS the current tab, never a different one. A sine wave visibly
// travels left to right across the current word when `active` changes; the
// word swaps at the peak (mid-sweep, already unreadable), and the same wave
// carries the new word's letters down flat — the wave doesn't fade the word
// away, it becomes it.
export function LifeCycleWordFlow({ active }: { active: LifeCycleId }) {
  const [displayed, setDisplayed] = useState(active)
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([])
  const prevActive = useRef(active)

  useEffect(() => {
    if (active === prevActive.current) return
    prevActive.current = active

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplayed(active)
      return
    }

    const applyWave = (t: number) => {
      const letters = letterRefs.current
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

    let frame = 0
    let swapped = false
    const start = performance.now()

    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / MORPH_MS)
      applyWave(easeInOut(t))
      if (!swapped && t >= 0.5) {
        swapped = true
        setDisplayed(active)
      }
      if (t < 1) frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [active])

  const word = labelFor(displayed)
  letterRefs.current = []

  return (
    <div className='flex h-16 items-center justify-center sm:h-20'>
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
