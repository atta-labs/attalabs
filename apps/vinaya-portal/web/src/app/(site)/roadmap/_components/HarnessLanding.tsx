'use client'

// HarnessLanding — the moon-landing scene, ported 1:1 from the Claude Design handoff's scene
// SVG (viewBox 0 0 1400 560: the home planet with its craters, the landing pad slab). The landing's TRIGGER and PROGRESS are
// unchanged: ONE scroll-derived value, L (0 -> 1), from the pure `computeLanding` below
// (`frame.deployed` + `frame.installDoneAt`; no keyframes, no history, so scrolling back
// un-lands exactly). It writes custom properties on `trackRef`; of them only `--lp` (the
// scene materialises, L 0.00 -> 0.30) is read here, and the track's `data-landed` flag
// (true from touchdown) starts the drift and the comets.
//
//   • The scene is drawn in its own 1400x560 units, scaled by `k` = 0.0434rem per unit (the
//     design's `k = u / 1.44` with u = the pad's 0.0625rem per unit) about the slab's top
//     centre, at every width (the narrow pad is full size). The
//     rocket is the HEAD overlay in `DeploymentTrack`: at touchdown its nose tip rests on
//     the slab top (4.5rem below the head anchor, against the 2.875rem the pure
//     `computeLanding` uses for `deckTop`, hence the 1.625rem nudge on the scene's `top`).
//   • Comets are the design's `tick()` numbers in scene units: one at a time, the first 1.5-3s
//     after landing, then a 5-11s gap; 520 units in 1.8s, linear, a 70-unit gradient tail, fading
//     over the first and last 20%. A single rAF loop writes the attributes; none of it runs
//     under reduced motion. The scene keeps only the destination: the home planet and the pad
//     (no moon, ringed planet or star field).
//   • Dimensions are rem; colours are `var(--foreground|--card)` presentation attributes.

import { forwardRef, useEffect, useId, useRef } from 'react'

export const LANDING = {
  approachRem: 26.25, // 420 design px of beam travel for the whole landing
  headToDeckRem: 2.875, // 46 design px: head anchor → legs' feet = deck top
  padBelowDeckRem: 6.25 // 100 design px: deck top → ground line (run-out must fit it)
}

const c01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const seg = (L: number, a: number, b: number) => c01((L - a) / (b - a))

export type LandingFrame = {
  L: number
  headTop: number // clamped tip — use for headRef.top, beamOuter height AND crackle length
  deckTop: number // px, track-local — write to the pad anchor's style.top
  landed: boolean // true from touchdown on — zero the velocity target
  lock: number // --lk, also drains the crackle
  vars: Record<string, string>
}

// Pure: geometry in, state out. `remPx` = the root's real font-size in px
// (18 in this app) so the rem constants above become real pixels to match
// `deployed`, which is already measured in real px.
export function computeLanding(deployed: number, installDoneAt: number, remPx: number): LandingFrame {
  const approach = LANDING.approachRem * remPx
  const touch = installDoneAt + approach * 0.8
  const L = Number.isFinite(installDoneAt) ? c01((deployed - installDoneAt) / approach) : 0
  const ds = seg(L, 0.72, 1)
  const lock = seg(L, 0.8, 0.95)
  return {
    L,
    headTop: Number.isFinite(touch) ? Math.min(deployed, touch) : deployed,
    deckTop: touch + LANDING.headToDeckRem * remPx,
    landed: deployed >= touch,
    lock,
    vars: {
      '--lp': seg(L, 0, 0.3).toFixed(4),
      '--lg': seg(L, 0.3, 0.65).toFixed(4),
      '--ds': ds.toFixed(4),
      '--dso': Math.sin(Math.PI * ds).toFixed(4),
      '--lk': lock.toFixed(4),
      '--af': (1 - seg(L, 0.6, 0.85)).toFixed(4)
    }
  }
}

const NS = 'non-scaling-stroke'

// The scene + the comet loop. A zero-size anchor on the beam centreline at the DECK
// TOP; `style.top` is written imperatively by the scroll effect (same carve-out as headRef).
// Mount it BEFORE the beam/head so the head paints over the scene.
export const HarnessLanding = forwardRef<HTMLDivElement>(function HarnessLanding(_, ref) {
  const gradientId = useId().replace(/:/g, '')
  const cometRef = useRef<SVGLineElement>(null)

  useEffect(() => {
    const comet = cometRef.current
    if (!comet) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const track = comet.closest<HTMLElement>('[data-landed]')
    if (!track) return

    let raf = 0
    let wasLanded: boolean | null = null
    let cometNext = Number.POSITIVE_INFINITY
    let live: { dir: number; ang: number; x: number; y: number; t0: number } | null = null

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return
      const landed = track.dataset.landed === 'true'
      if (landed !== wasLanded) {
        wasLanded = landed
        if (landed) {
          cometNext = now + 1500 + Math.random() * 1500
        } else {
          live = null
          comet.setAttribute('opacity', '0')
        }
      }

      if (!landed) return
      if (!live && now > cometNext) {
        const dir = Math.random() < 0.5 ? 1 : -1
        const ang = ((15 + Math.random() * 20) * Math.PI) / 180
        live = {
          dir,
          ang,
          x: dir > 0 ? 120 + Math.random() * 480 : 800 + Math.random() * 480,
          y: 30 + Math.random() * 130,
          t0: now
        }
        comet.setAttribute('stroke', `url(#${gradientId}${dir > 0 ? 'R' : 'L'})`)
      }
      if (live) {
        const q = (now - live.t0) / 1800
        if (q >= 1) {
          live = null
          comet.setAttribute('opacity', '0')
          cometNext = now + 5000 + Math.random() * 6000
        } else {
          const ux = Math.cos(live.ang) * live.dir
          const uy = Math.sin(live.ang)
          const hx = live.x + ux * 520 * q
          const hy = live.y + uy * 520 * q
          comet.setAttribute('x1', String(hx - ux * 70))
          comet.setAttribute('y1', String(hy - uy * 70))
          comet.setAttribute('x2', String(hx))
          comet.setAttribute('y2', String(hy))
          comet.setAttribute('opacity', String(Math.min(1, q / 0.2, (1 - q) / 0.2)))
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [gradientId])

  return (
    <div
      ref={ref}
      aria-hidden
      className='pointer-events-none absolute top-0 left-1/2 size-0 opacity-[var(--lp,0)] max-[52.5rem]:left-[4.90625rem]'
    >
      {/* 1400x560 scene units at 0.0434rem each = 60.764rem x 24.306rem; the slab's top centre
          (700, 378) = (30.382rem, 16.406rem) is the transform origin and sits 1.625rem below
          the anchor (nose tip of the 72-unit head), on every width: the narrow pad and head are full size too. */}
      <svg
        viewBox='0 0 1400 560'
        fill='none'
        stroke='var(--foreground)'
        strokeWidth='2'
        className='absolute top-[-14.781rem] left-[-30.382rem] h-[24.306rem] w-[60.764rem] origin-[50%_67.5%]'
      >
        <defs>
          <linearGradient id={`${gradientId}R`} x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0' stopColor='var(--foreground)' stopOpacity='0' />
            <stop offset='1' stopColor='var(--foreground)' stopOpacity='0.7' />
          </linearGradient>
          <linearGradient id={`${gradientId}L`} x1='1' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor='var(--foreground)' stopOpacity='0' />
            <stop offset='1' stopColor='var(--foreground)' stopOpacity='0.7' />
          </linearGradient>
        </defs>
        <line
          ref={cometRef}
          x1='0'
          y1='0'
          x2='0'
          y2='0'
          stroke={`url(#${gradientId}R)`}
          strokeWidth='1.5'
          strokeLinecap='round'
          opacity='0'
          vectorEffect={NS}
        />
        <circle cx='700' cy='780' r='380' fill='var(--card)' vectorEffect={NS} />
        <ellipse cx='560' cy='470' rx='26' ry='8' strokeWidth='1.2' opacity='0.45' vectorEffect={NS} />
        <ellipse cx='850' cy='452' rx='18' ry='6' strokeWidth='1.2' opacity='0.45' vectorEffect={NS} />
        <ellipse cx='730' cy='525' rx='34' ry='10' strokeWidth='1.2' opacity='0.45' vectorEffect={NS} />
        <line x1='664' y1='390' x2='656' y2='401' vectorEffect={NS} />
        <line x1='736' y1='390' x2='744' y2='401' vectorEffect={NS} />
        <rect x='650' y='378' width='100' height='12' fill='var(--card)' vectorEffect={NS} />
        <line x1='670' y1='384' x2='690' y2='384' strokeWidth='3' strokeLinecap='round' vectorEffect={NS} />
        <line x1='710' y1='384' x2='730' y2='384' strokeWidth='3' strokeLinecap='round' vectorEffect={NS} />
      </svg>
    </div>
  )
})
