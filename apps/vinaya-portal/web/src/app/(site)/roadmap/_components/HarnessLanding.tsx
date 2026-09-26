'use client'

// HarnessLanding — the bookend to the launchpad. Ported from the designer's
// reference file `The Landing - isolated.html` (open it to see the target
// behaviour). Same contract as the rest of DeploymentTrack:
//
//   • ONE scroll-derived value, L (0→1), computed by the pure `computeLanding`
//     below from `frame.deployed` + `frame.installDoneAt`. No keyframes, no
//     history — scroll back and it un-lands exactly.
//   • It writes six custom properties on `trackRef` (inherited by the pad,
//     the landscape AND the head's legs/atmosphere):
//       --lp  pad + landscape materialise   L 0.00 → 0.30
//       --lg  landing legs deploy           L 0.30 → 0.65
//             touchdown: head reaches the deck at L 0.80 and STOPS
//       --ds  touchdown dust spreads        L 0.72 → 1.00
//       --dso dust opacity, sin(π·ds) — a bell that peaks at contact
//       --lk  clamps close, ties + rim light L 0.80 → 0.95
//       --af  head atmosphere fades         L 0.60 → 0.85
//   • Every dimension is rem (16px design px → /16), matching RULE 3 and the
//     18px root. The only px literals are `origin-[…px_…px]` on SVG children
//     with `[transform-box:view-box]` — those are viewBox USER UNITS, not CSS
//     layout, so they scale with the svg and are not a rem/px mixing hazard.
//   • Colours are `var(--foreground|--primary|--card|--background)` only.

import { forwardRef } from 'react'

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

// The pad + the planet landscape behind it. A zero-size anchor on the beam
// centreline at the DECK TOP; `style.top` is written imperatively by the scroll
// effect (same carve-out as headRef). Mount it BEFORE the beam so the nose
// paints over the deck.
export const HarnessLanding = forwardRef<HTMLDivElement>(function HarnessLanding(_, ref) {
  return (
    <div
      ref={ref}
      aria-hidden
      className='pointer-events-none absolute top-0 left-1/2 size-0 opacity-[var(--lp,0)] max-[52.5rem]:left-[3.375rem]'
    >
      {/* THE LANDSCAPE — 900×360 viewBox; the anchor (deck top) is at (450,220)
          and the ground's crest sits exactly under the pad's footings. Edges
          masked so it never ends abruptly on a wide screen. */}
      <svg
        viewBox='0 0 900 360'
        fill='none'
        className='absolute top-[-13.75rem] left-[-28.125rem] h-[22.5rem] w-[56.25rem] origin-[28.125rem_13.75rem] overflow-visible [mask-image:linear-gradient(to_right,transparent,black_14%,black_86%,transparent)] max-[52.5rem]:scale-50'
      >
        {/* stars, in five literal tiers so the sky fills in as the rocket approaches */}
        <g className='opacity-[clamp(0,calc(var(--lp,0)*2.2-0.15),1)]'>
          <circle cx='102' cy='203' r='0.84' fill='var(--foreground)' />
          <circle cx='564' cy='65' r='1.04' fill='var(--foreground)' />
          <circle cx='874' cy='42' r='1.03' fill='var(--foreground)' />
          <circle cx='818' cy='134' r='0.85' fill='var(--foreground)' />
        </g>
        <g className='opacity-[clamp(0,calc(var(--lp,0)*2.2-0.35),1)]'>
          <circle cx='734' cy='26' r='1.29' fill='var(--foreground)' />
          <circle cx='845' cy='39' r='1.12' fill='var(--foreground)' />
          <circle cx='670' cy='54' r='0.87' fill='var(--foreground)' />
          <circle cx='582' cy='208' r='1.13' fill='var(--foreground)' />
          <circle cx='191' cy='107' r='1.59' fill='var(--foreground)' />
          <circle cx='833' cy='215' r='1.02' fill='var(--foreground)' />
          <circle cx='163' cy='27' r='1.59' fill='var(--foreground)' />
          <circle cx='69' cy='147' r='1.17' fill='var(--foreground)' />
        </g>
        <g className='opacity-[clamp(0,calc(var(--lp,0)*2.2-0.55),1)]'>
          <circle cx='842' cy='88' r='1.10' fill='var(--foreground)' />
          <circle cx='185' cy='159' r='1.47' fill='var(--foreground)' />
          <circle cx='104' cy='152' r='1.17' fill='var(--foreground)' />
          <circle cx='356' cy='51' r='0.96' fill='var(--foreground)' />
          <circle cx='524' cy='100' r='1.08' fill='var(--foreground)' />
          <circle cx='58' cy='183' r='0.81' fill='var(--foreground)' />
          <circle cx='60' cy='83' r='0.89' fill='var(--foreground)' />
          <path
            d='M210 164 V174 M205 169 H215'
            stroke='var(--primary)'
            strokeWidth='1.4'
            strokeLinecap='round'
            className='[transform-box:fill-box] origin-center animate-[vin-twinkle_3.2s_ease-in-out_infinite] [animation-delay:3.61s] motion-reduce:animate-none'
          />
        </g>
        <g className='opacity-[clamp(0,calc(var(--lp,0)*2.2-0.75),1)]'>
          <circle cx='45' cy='117' r='0.98' fill='var(--foreground)' />
          <circle cx='327' cy='180' r='1.18' fill='var(--foreground)' />
          <circle cx='665' cy='179' r='1.39' fill='var(--foreground)' />
          <circle cx='44' cy='126' r='1.23' fill='var(--foreground)' />
          <circle cx='880' cy='143' r='1.55' fill='var(--foreground)' />
          <circle cx='55' cy='136' r='1.51' fill='var(--foreground)' />
          <path
            d='M568 50 V60 M563 55 H573'
            stroke='var(--primary)'
            strokeWidth='1.4'
            strokeLinecap='round'
            className='[transform-box:fill-box] origin-center animate-[vin-twinkle_3.2s_ease-in-out_infinite] [animation-delay:3.66s] motion-reduce:animate-none'
          />
        </g>
        <g className='opacity-[clamp(0,calc(var(--lp,0)*2.2-0.95),1)]'>
          <circle cx='789' cy='36' r='1.50' fill='var(--foreground)' />
          <circle cx='124' cy='229' r='0.99' fill='var(--foreground)' />
          <circle cx='652' cy='169' r='0.91' fill='var(--foreground)' />
          <circle cx='572' cy='147' r='1.47' fill='var(--foreground)' />
          <circle cx='204' cy='153' r='1.00' fill='var(--foreground)' />
          <path
            d='M280 199 V209 M275 204 H285'
            stroke='var(--primary)'
            strokeWidth='1.4'
            strokeLinecap='round'
            className='[transform-box:fill-box] origin-center animate-[vin-twinkle_3.2s_ease-in-out_infinite] [animation-delay:3.93s] motion-reduce:animate-none'
          />
          <path
            d='M266 126 V136 M261 131 H271'
            stroke='var(--primary)'
            strokeWidth='1.4'
            strokeLinecap='round'
            className='[transform-box:fill-box] origin-center animate-[vin-twinkle_3.2s_ease-in-out_infinite] [animation-delay:3.61s] motion-reduce:animate-none'
          />
        </g>
        {/* small moon, top left */}
        <circle
          cx='150'
          cy='90'
          r='12'
          fill='var(--background)'
          stroke='var(--foreground)'
          strokeWidth='1.6'
          opacity='0.5'
        />
        <path d='M144 84 A8 8 0 0 0 150 101' stroke='var(--foreground)' strokeWidth='1.2' opacity='0.3' />
        {/* ringed planet, top right: back of ring, body, front of ring */}
        <g transform='rotate(-18 730 120)'>
          <path d='M668 120 A62 14 0 0 1 792 120' stroke='var(--primary)' strokeWidth='2' opacity='0.4' />
          <circle
            cx='730'
            cy='120'
            r='34'
            fill='var(--background)'
            stroke='var(--foreground)'
            strokeWidth='2'
            opacity='0.9'
          />
          <path d='M699 108 H761 M697 126 H763' stroke='var(--foreground)' strokeWidth='1.4' opacity='0.22' />
          <path
            d='M668 120 A62 14 0 0 0 792 120'
            stroke='var(--primary)'
            strokeWidth='2.4'
            strokeLinecap='round'
            opacity='0.75'
          />
        </g>
        {/* distant ridges — angular, like the harness */}
        <path
          d='M0 322 L58 292 L104 308 L168 262 L226 298 L286 280 L352 312 L380 360 H0 Z M900 318 L846 272 L786 290 L724 248 L668 292 L612 276 L548 312 L520 360 H900 Z'
          fill='var(--background)'
        />
        <path
          d='M0 322 L58 292 L104 308 L168 262 L226 298 L286 280 L352 312 M900 318 L846 272 L786 290 L724 248 L668 292 L612 276 L548 312'
          stroke='var(--foreground)'
          strokeWidth='1.6'
          strokeLinejoin='miter'
          opacity='0.35'
        />
        {/* the planet's curve — crest at y 306 = anchor + 86 */}
        <path d='M0 350 Q450 262 900 350 V360 H0 Z' fill='var(--background)' />
        <path d='M0 350 Q450 262 900 350' stroke='var(--foreground)' strokeWidth='2' />
        {/* rim light along the horizon once locked */}
        <path
          d='M120 330 Q450 272 780 330'
          stroke='var(--primary)'
          strokeWidth='2.4'
          strokeLinecap='round'
          className='opacity-[calc(0.7*var(--lk,0))]'
        />
        {/* craters */}
        <ellipse cx='214' cy='332' rx='16' ry='3' stroke='var(--foreground)' strokeWidth='1.4' opacity='0.3' />
        <ellipse cx='258' cy='322' rx='7' ry='1.6' stroke='var(--foreground)' strokeWidth='1.2' opacity='0.22' />
        <ellipse cx='688' cy='330' rx='12' ry='2.5' stroke='var(--foreground)' strokeWidth='1.4' opacity='0.3' />
      </svg>

      {/* receiving glow in the aperture — lights on lock */}
      <div className='absolute top-[-1.875rem] left-[-2.5rem] size-[5rem] rounded-full opacity-[calc(0.15+0.85*var(--lk,0))] bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_38%,transparent)_0%,transparent_62%)]' />

      {/* THE PAD — the launchpad inverted: deck on top, towers and ties BELOW it,
          because nothing may cross the path the head comes down. 200×100
          viewBox, deck top at y 10 = the anchor. */}
      <svg
        viewBox='0 0 200 100'
        fill='none'
        className='absolute top-[-0.625rem] left-[-6.25rem] h-[6.25rem] w-[12.5rem] origin-[6.25rem_0.625rem] overflow-visible max-[52.5rem]:scale-50'
      >
        {/* touchdown dust, skimming the deck top */}
        <g
          stroke='var(--primary)'
          strokeLinecap='round'
          className='[transform-box:view-box] origin-[100px_10px] [transform:scaleX(calc(0.35+0.9*var(--ds,0)))] opacity-[var(--dso,0)] motion-reduce:hidden'
        >
          <path d='M88 8 Q62 2 34 8 M112 8 Q138 2 166 8' strokeWidth='2.4' opacity='0.6' />
          <path d='M82 3 Q68 -2 52 3 M118 3 Q132 -2 148 3' strokeWidth='1.8' opacity='0.35' />
        </g>
        {/* cross-ties: static, then energised on lock */}
        <path d='M42 40 H158 M42 58 H158 M42 76 H158' stroke='var(--foreground)' strokeWidth='1.6' opacity='0.26' />
        <path
          d='M42 40 H158 M42 58 H158 M42 76 H158'
          stroke='var(--primary)'
          strokeWidth='1.6'
          className='opacity-[calc(0.85*var(--lk,0))]'
        />
        {/* towers, standing down into the ground */}
        <rect x='26' y='26' width='16' height='54' fill='var(--card)' stroke='var(--foreground)' strokeWidth='2' />
        <rect x='158' y='26' width='16' height='54' fill='var(--card)' stroke='var(--foreground)' strokeWidth='2' />
        {/* deck in two slabs — the 20-unit gap is the aperture the nose seats into */}
        <rect x='6' y='10' width='84' height='16' fill='var(--card)' stroke='var(--foreground)' strokeWidth='2.4' />
        <rect x='110' y='10' width='84' height='16' fill='var(--card)' stroke='var(--foreground)' strokeWidth='2.4' />
        <path
          d='M22 18 H50 M150 18 H178'
          stroke='var(--primary)'
          strokeWidth='3.2'
          strokeLinecap='round'
          className='opacity-[calc(0.4+0.6*var(--lk,0))]'
        />
        {/* footings + ground */}
        <path d='M34 80 L22 94 M166 80 L178 94' stroke='var(--foreground)' strokeWidth='2.2' />
        <path d='M0 96 H200' stroke='var(--foreground)' strokeWidth='1.6' opacity='0.22' />
      </svg>

      {/* hold-down clamps — the launchpad's, drawn CLOSED and rotated open by
          (1 − --lk). Deliberately NOT scaled on mobile, so the jaws still meet
          the (unscaled) nose. 60×40 viewBox, deck top at y 30. */}
      <svg
        viewBox='0 0 60 40'
        fill='none'
        className='absolute top-[-1.875rem] left-[-1.875rem] h-[2.5rem] w-[3.75rem] overflow-visible'
      >
        <path
          d='M14 30 V16 H20.5'
          stroke='var(--foreground)'
          strokeWidth='2.2'
          strokeLinejoin='miter'
          className='[transform-box:view-box] origin-[14px_30px] [transform:rotate(calc(-52deg*(1-var(--lk,0))))]'
        />
        <path
          d='M46 30 V16 H39.5'
          stroke='var(--foreground)'
          strokeWidth='2.2'
          strokeLinejoin='miter'
          className='[transform-box:view-box] origin-[46px_30px] [transform:rotate(calc(52deg*(1-var(--lk,0))))]'
        />
      </svg>
    </div>
  )
})

// Landing legs — belong to the HEAD. Mount inside headRef, directly BEFORE the
// nose <svg>, so they sit behind it. Same box as the nose (48×64 viewBox,
// top-[-0.25rem] left-[-1.5rem] h-[4rem] w-[3rem]); feet land on nose-y 50,
// which is the deck top.
export function LandingLegs() {
  return (
    <svg
      viewBox='0 0 48 64'
      fill='none'
      className='absolute top-[-0.25rem] left-[-1.5rem] h-[4rem] w-[3rem] overflow-visible'
    >
      <path
        d='M5 30 L-6 48 M-11 50 H-1'
        stroke='var(--foreground)'
        strokeWidth='2.2'
        strokeLinejoin='miter'
        className='[transform-box:view-box] origin-[5px_30px] [transform:scale(var(--lg,0))] opacity-[var(--lg,0)]'
      />
      <path
        d='M43 30 L54 48 M49 50 H59'
        stroke='var(--foreground)'
        strokeWidth='2.2'
        strokeLinejoin='miter'
        className='[transform-box:view-box] origin-[43px_30px] [transform:scale(var(--lg,0))] opacity-[var(--lg,0)]'
      />
    </svg>
  )
}
