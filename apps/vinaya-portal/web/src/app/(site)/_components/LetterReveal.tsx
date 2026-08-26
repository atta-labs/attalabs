'use client'

import { useEffect, useRef, useState } from 'react'

// Splits text into words (kept intact so line-wrap never lands mid-word), each word split
// into per-character spans staggered via transitionDelay. `revealed` starts false so the
// browser has a "before" state to transition from, then flips true once the wrapping span
// scrolls into view (IntersectionObserver, one-shot — matches RevealGrid's established
// pattern elsewhere on this page) or immediately under prefers-reduced-motion. Most callers
// mount well before they're scrolled to (every section renders up front, just off-screen),
// so gating on visibility — not mount — is what actually makes this read as a per-title
// reveal instead of firing invisibly on page load.
export function LetterReveal({
  text,
  delayStepMs = 16,
  startIndex = 0
}: {
  text: string
  delayStepMs?: number
  // Offsets every char's delay — pass the previous line's char count so a multi-line
  // title reveals sequentially instead of every line starting at once.
  startIndex?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true)
      return
    }

    const reveal = () => setRevealed(true)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal()
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(element)
    // Scroll/resize listeners alone can miss the first crossing when the element is
    // already in view at mount, before the observer's first callback fires — the poll
    // is what actually catches that case (same pattern as RevealGrid).
    const poll = window.setInterval(() => {
      const rect = element.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
        reveal()
        observer.disconnect()
        window.clearInterval(poll)
      }
    }, 250)
    return () => {
      observer.disconnect()
      window.clearInterval(poll)
    }
  }, [])

  const words = text.split(' ')
  let charIndex = startIndex

  return (
    <span ref={ref}>
      {words.map((word, wordIndex) => {
        const chars = [...word]
        const rendered = (
          <span key={wordIndex} className='inline-block whitespace-nowrap'>
            {chars.map((ch, i) => {
              const delay = (charIndex + i) * delayStepMs
              return (
                <span
                  key={i}
                  className={`inline-block transition-all duration-300 ease-out ${
                    revealed ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                  }`}
                  style={{ transitionDelay: `${delay}ms` }}
                >
                  {ch}
                </span>
              )
            })}
          </span>
        )
        charIndex += chars.length + 1 // +1 for the space that follows this word
        return (
          <span key={`w-${wordIndex}`}>
            {rendered}
            {wordIndex < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </span>
  )
}
