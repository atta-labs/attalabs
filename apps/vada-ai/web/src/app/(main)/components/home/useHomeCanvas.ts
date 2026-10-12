'use client'

import { useEffect, useState } from 'react'

// Bumped when the intro is intentionally redesigned — existing visitors see the
// new version once, then resume skipping. `?intro=1` always replays it.
const INTRO_SEEN_KEY = 'vada:home-intro-seen-v6'

// Outside Read's four reviewers on the arc (`HeroFabric3D.tsx`).
const REVIEWER_COUNT = 4
// The Synthesizer hub plus every reviewer on the arc.
const CORE_COUNT = REVIEWER_COUNT + 1
const CORE_GAP_MS = 220

// The cores assemble on load: the hub first, then the reviewers left to right. The rest
// of the deliberation is scrubbed by scroll inside the scene.
export function useRingSequence() {
  const [revealedCount, setRevealedCount] = useState(0)

  useEffect(() => {
    const forceIntro = new URLSearchParams(window.location.search).has('intro')
    let alreadySeen = false
    try {
      alreadySeen = window.localStorage.getItem(INTRO_SEEN_KEY) === '1'
    } catch {}
    if ((alreadySeen && !forceIntro) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealedCount(CORE_COUNT)
      return
    }

    let cancelled = false
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const run = async () => {
      await wait(500)
      for (let i = 1; i <= CORE_COUNT && !cancelled; i++) {
        setRevealedCount(i)
        await wait(i === 1 ? 500 : CORE_GAP_MS)
      }
      if (cancelled) return
      try {
        window.localStorage.setItem(INTRO_SEEN_KEY, '1')
      } catch {}
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  return { revealedCount }
}

// Opening-state visibility: the title fades once the camera starts to tip.
export function useHeroScrolled(threshold = 0.04) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const check = () => {
      const track = document.getElementById('hero')
      if (!track) return
      const r = track.getBoundingClientRect()
      const travel = r.height - window.innerHeight
      setScrolled(travel > 20 && -r.top / travel > threshold)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [threshold])
  return scrolled
}
