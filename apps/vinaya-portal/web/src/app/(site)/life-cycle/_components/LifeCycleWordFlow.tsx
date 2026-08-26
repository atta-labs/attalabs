'use client'

import { useEffect, useRef, useState } from 'react'

const WORDS = ['Milestone', 'Tranche', 'Task'] as const
const HOLD_MS = 1300
const MORPH_MS = 900
const PEAK_PX = 16
const TRAVEL_CYCLES = 2

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

// Real letters, our own type scale — no canvas, no filter noise. A sine wave
// visibly travels left to right across the current word while its overall
// amplitude rises then falls; the word swaps at the peak (mid-sweep, already
// unreadable), and the same wave carries the new word's letters down flat —
// the wave doesn't fade the word away, it becomes it.
export function LifeCycleWordFlow() {
  const [wordIndex, setWordIndex] = useState(0)
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let index = 0
    let phase: 'hold' | 'morph' = 'hold'
    let phaseStart = performance.now()
    let swapped = false

    const applyWave = (t: number, active: boolean) => {
      const letters = letterRefs.current
      const count = letters.length
      const amplitude = active ? Math.sin(Math.PI * t) * PEAK_PX : 0
      for (let i = 0; i < count; i++) {
        const el = letters[i]
        if (!el) continue
        const travel = (i / Math.max(1, count - 1)) * Math.PI * 2 - t * Math.PI * 2 * TRAVEL_CYCLES
        const y = amplitude * Math.sin(travel)
        el.style.transform = `translateY(${y}px)`
      }
    }

    const draw = (now: number) => {
      const elapsed = now - phaseStart

      if (phase === 'hold' || reduced) {
        applyWave(0, false)
        if (elapsed >= HOLD_MS) {
          if (reduced) {
            index = (index + 1) % WORDS.length
            setWordIndex(index)
          } else {
            phase = 'morph'
            swapped = false
          }
          phaseStart = now
        }
      } else {
        const t = Math.min(1, elapsed / MORPH_MS)
        applyWave(easeInOut(t), true)
        if (!swapped && t >= 0.5) {
          swapped = true
          index = (index + 1) % WORDS.length
          setWordIndex(index)
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
  }, [])

  const word = WORDS[wordIndex] ?? WORDS[0]
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
