'use client'

import { useLayoutEffect, useRef } from 'react'

/**
 * Vinaya Portal's hero-lockup letters (`HeroLockup.tsx`'s `Letters`): one inline-block span per
 * character with its own `transitionDelay`, hidden by CSS until the first layout pass, then
 * flipped to visible — the same per-letter cascade `VinayaHeroEmblem.tsx` triggers on mount.
 */
export function LetterReveal({ text, delayStep }: { text: string; delayStep: number }) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    // next frame, so the hidden state is painted once and the transition has a "before"
    const id = requestAnimationFrame(() => {
      for (const el of root.querySelectorAll<HTMLElement>('[data-letter]')) {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }
    })
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <span ref={ref}>
      {[...text].map((ch, i) => (
        <span
          key={i}
          data-letter
          className='inline-block translate-y-[0.125em] opacity-0 transition-[opacity,transform] duration-500 ease-out'
          style={{ transitionDelay: `${i * delayStep}ms` }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}
