'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { readThemeColors } from './canvas/theme-colors'

// Deterministic pseudo-random 0..1 from an int — the hero's `HarnessStructure.hash01`,
// used here EXACTLY as it is there: once per vertex, to fix that vertex's own phase
// offset. It is never fed a continuously-changing input — that was the earlier bug
// (hash01 is a spatial scramble, not a smooth noise function; a moving phase through it
// jumps rather than drifts, which read as "moving too fast").
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const SEGS_PER_EDGE = 8

// Three strands — the hero's own `HarnessStructure.BRANCHES_PER_CONDUIT`. All three run
// at the exact same speed (a single shared `time`, see the render loop) — only
// seed/band/amplitude/weight/color differ. `band` is each strand's own resting inset
// from the box's true edge, deliberately close together and smaller than `amplitude` so
// the 3 strands' swings OVERLAP and cross each other (real forked lightning weaves; it
// does not sit in tidy concentric rings — that tidy-rings look was the earlier bug).
// `color` picks a distinct theme token per strand — semantic tokens only, never a
// hardcoded hex — so the three read as visually different, not one blurred mass.
// Every `band − amplitude` stays clear of 0 (the true edge — the canvas's own clip
// boundary) and every `band + amplitude` stays well under the `p-2` (8px) padding.
const STRANDS = [
  { width: 0.5, band: 3, amplitude: 2, seed: 0, alpha: 0.25, color: 'primary' as const },
  { width: 0.5, band: 2.7, amplitude: 1.8, seed: 53, alpha: 0.25, color: 'primary' as const },
  { width: 0.5, band: 3.3, amplitude: 1.9, seed: 107, alpha: 0.25, color: 'secondary' as const }
]
const SPEED = 0.035 // one shared speed for every strand
// A side does not fade in as a block — it DRAWS ON, corner to corner, over GROW_MS (the
// same direction `sidePoints` already generates its points in). No opacity ramp: once a
// side starts growing it's at full strand alpha immediately, only its drawn LENGTH grows.
const GROW_MS = 500
// A field snapping on in 2 stages, not one shape appearing all at once or 12 fully
// independent timers: the box's 4 sides split into 2 groups of 2 (which grouping, and
// which group goes first, is randomized fresh every activation — see `SIDE_PAIRINGS` and
// its use below), and every side in a group starts growing together. `STRAND_JITTER_MS`
// adds a small per-strand offset within that so all 3 strands on a side don't look
// robotically simultaneous, without breaking the 2-group read.
// Tied to GROW_MS, not a separate constant: stage 2 starts partway through stage 1's own
// draw-on (overlapping, not waiting for it to finish), so the two read as one continuous
// flow with no idle gap — a longer, non-overlapping gap here was the earlier "little
// pause" between the two.
const STAGE_GAP_MS = GROW_MS * 0.5 // stage 2 starts mid-way through stage 1's own draw-on
const STRAND_JITTER_MS = 150

// The hero's own `HarnessStructure.waveArc` formula — a REAL sine function of `time`,
// not `hash01` fed a changing input. This distinction is load-bearing: `hash01` is a
// spatial scramble (`sin(x * 127.1)`), so even a slow, steady change in its input jumps
// the output around rather than gliding it — no speed constant fixes that, it is the
// wrong tool for continuous motion, however small the step. `hash01` still appears here,
// but only on `i` (each vertex's own fixed index) to pick that vertex's own constant
// phase ONCE — `time` only ever reaches the actual `Math.sin(... - time ...)` terms,
// which are genuinely continuous, so `SPEED` actually controls how fast it moves.
// `env` (0 at both ends of a span, peaking mid-span) pins every strand to exactly 0 at a
// corner, whatever its seed — see `perimeterPoints` for why the corner itself is also a
// single shared point across edges, which is what actually keeps every strand's corners
// aligned (the jag going to 0 there is necessary but not sufficient).
function waveOffset(t: number, i: number, time: number, seed: number): number {
  const env = Math.sin(t * Math.PI)
  const h1 = hash01(i + seed)
  const h2 = hash01(i + seed + 97)
  const raw = Math.sin(i * 1.5 - time + h1 * 6.283) * 0.62 + Math.sin(i * 5.3 - time * 1.9 + h2 * 6.283) * 0.38
  return raw * env
}

// A small `rounded-sm`-style bevel at each corner, not a full circle — the shape must
// still read as a rectangle. Clamped so it can never exceed half the traced rectangle's
// own width/height (only relevant if `band` ever grows close to `w/h`, which it never
// does at this element's size, but the clamp keeps the geometry valid regardless).
const CORNER_RADIUS = 2.5
const CORNER_SEGS = 3

// The 4 independent sides a strand splits into — top/right/bottom/left, each its own
// segment with its own charge timing. Each side OWNS the corner arc immediately after it
// in this order (top owns the top-right corner, right owns the bottom-right corner,
// etc.) — so once all 4 sides of a strand are charged in, the loop reads as seamless, and
// while only some are, it reads as a field snapping on rather than one shape fading in.
const SIDES = ['top', 'right', 'bottom', 'left'] as const
type Side = (typeof SIDES)[number]

// The 3 ways to split 4 sides into 2 opposing/diagonal pairs — one is picked at random
// per activation (see the render effect), and which pair of the chosen split goes first
// is ALSO randomized, so it's sometimes top+bottom then left+right, sometimes the
// reverse, sometimes a diagonal pair either way — genuinely random, never a fixed order.
const SIDE_PAIRINGS: Array<[[Side, Side], [Side, Side]]> = [
  [
    ['top', 'bottom'],
    ['left', 'right']
  ],
  [
    ['top', 'right'],
    ['bottom', 'left']
  ],
  [
    ['top', 'left'],
    ['bottom', 'right']
  ]
]

// One side's resting run: a straight edge, inset `band` px from the box's true edge,
// trimmed `CORNER_RADIUS` short of the true corner on both ends, with a small
// quarter-circle arc (plain, no jag) bridging the trailing end into the next side's own
// start point. Built against a rectangle inset UNIFORMLY from the box (not derived by
// pushing each edge inward along its own normal from the true corners, which was the
// actual bug behind an earlier "origin and end do not match": two edges meeting at a
// true corner along two DIFFERENT normals land on two DIFFERENT points, an L-shaped gap
// rather than one shared corner). Because every side computes its corner arc from that
// same uniformly-inset rectangle, a fully-charged strand's 4 sides always meet exactly,
// however many sides happen to be charged at once.
//
// The wave swings BIDIRECTIONALLY (`waveOffset` is signed) across the straight run only
// — inward and outward around `band`, never past 0 (the canvas's own clip boundary) —
// envelope-pinned to exactly 0 at both trimmed ends, so every strand's side, whatever its
// own `band`, meets its own corner arc at the same point (up to the small residual noted
// on `waveOffset`).
function sidePoints(
  w: number,
  h: number,
  time: number,
  seed: number,
  band: number,
  amplitude: number,
  side: Side
): Array<{ x: number; y: number }> {
  const rx0 = band
  const ry0 = band
  const rx1 = w - band
  const ry1 = h - band
  const r = Math.min(CORNER_RADIUS, (rx1 - rx0) / 2, (ry1 - ry0) / 2)
  const HALF_PI = Math.PI / 2

  const pts: Array<{ x: number; y: number }> = []
  // Each side gets its own vertex-index range (a big fixed offset per side) so its
  // `hash01`-derived phase never collides with another side's — purely cosmetic
  // variety, not required for correctness.
  let vertex = SIDES.indexOf(side) * 1000

  const addEdge = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    for (let i = 0; i < SEGS_PER_EDGE; i++) {
      const t = i / SEGS_PER_EDGE
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t
      const jag = waveOffset(t, vertex, time, seed) * amplitude
      pts.push({ x: x + nx * jag, y: y + ny * jag })
      vertex++
    }
  }
  // `startAngle`/`endAngle` in radians, 0 = +x axis, increasing clockwise (canvas's own
  // y-down convention) — same angle convention `Math.cos`/`Math.sin` already use here.
  const addCorner = (cx: number, cy: number, startAngle: number, endAngle: number) => {
    for (let i = 0; i <= CORNER_SEGS; i++) {
      const a = startAngle + ((endAngle - startAngle) * i) / CORNER_SEGS
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
    }
  }

  if (side === 'top') {
    addEdge(rx0 + r, ry0, rx1 - r, ry0, 0, -1)
    addCorner(rx1 - r, ry0 + r, -HALF_PI, 0) // top-right
  } else if (side === 'right') {
    addEdge(rx1, ry0 + r, rx1, ry1 - r, 1, 0)
    addCorner(rx1 - r, ry1 - r, 0, HALF_PI) // bottom-right
  } else if (side === 'bottom') {
    addEdge(rx1 - r, ry1, rx0 + r, ry1, 0, 1)
    addCorner(rx0 + r, ry1 - r, HALF_PI, Math.PI) // bottom-left
  } else {
    addEdge(rx0, ry1 - r, rx0, ry0 + r, -1, 0)
    addCorner(rx0 + r, ry0 + r, Math.PI, Math.PI * 1.5) // top-left
  }

  return pts
}

/**
 * A `<canvas>` (2D context, not SVG) tracing 3 thin strands of electricity — each split
 * into 4 sides (`SIDES`) that charge in as 2 random pairs, one after the other
 * (`SIDE_PAIRINGS`) — around its children, but only while `href` is the currently
 * active route. The hero's own `HarnessStructure`/`EnergyFieldBg` techniques, not a
 * reinvention: `BRANCHES_PER_CONDUIT`'s 3-strand count, `waveArc`'s own traveling-sine
 * math (ported to a straight edge instead of an arc, envelope-pinned to each side's own
 * corner so every strand's sides meet exactly once charged), theme colors read from CSS
 * custom properties (two strands `primary`, one `secondary` — semantic tokens only),
 * device-pixel-ratio scaling, one
 * `requestAnimationFrame` loop, a single static frame under `prefers-reduced-motion`.
 * `p-2` gives the loop room to swing without reaching the text.
 *
 * Active-route matching mirrors `@atta/ui/topbar`'s own `isActive` exactly (`exact` →
 * `pathname === href`, else a prefix match) so this control and the link's own text-color
 * highlight can never disagree about which nav item is "current." The `p-2`-padded wrapper
 * `<span>` renders UNCONDITIONALLY, active or not — an item's active state must change only
 * ITS OWN paint, never its own or a sibling's box size. Reserving the padding always, not
 * only while active, is what keeps activating an item from growing its box and shifting
 * every later item in the row (a real regression found live: the whole nav visibly
 * shifted right the moment `Home` went active on load). Only the `<canvas>` element and its
 * `requestAnimationFrame` loop stay conditional on `isActive` — no canvas, no RAF, on any
 * of the other items — so the zero-cost-when-inactive property this component exists for
 * is preserved; only the box-size cost was the bug, not the animation cost.
 *
 * Vinaya-only: composed in via `TopBarLink.label`'s `ReactNode` slot (`@atta/ui/topbar`),
 * so the shared TopBar itself stays agnostic to it.
 */
export function ElectricLabel({
  href,
  exact = false,
  children
}: {
  href: string
  exact?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isActive) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!wrap || !canvas || !ctx) return

    let colors = readThemeColors(wrap)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    // One shared `time` for all 3 strands — same speed, "THE SAME," not per-strand.
    let time = 0
    // Pick one of the 3 pairings, then randomize which pair of it fires first — a fresh
    // draw every activation (this effect re-runs whenever `isActive` flips). Every side
    // in the first pair gets stage 0 (delay ~0), every side in the second gets stage 1
    // (delay STAGE_GAP_MS later); `STRAND_JITTER_MS` adds a small per-strand offset on
    // top so the 3 strands on one side don't look robotically simultaneous. Skipped
    // under reduced motion: that path draws one static frame and stops, so it goes
    // straight to fully charged.
    const chargeStart = performance.now()
    const pairing = SIDE_PAIRINGS[Math.floor(Math.random() * SIDE_PAIRINGS.length)] ?? SIDE_PAIRINGS[0]!
    const [firstPair, secondPair] = Math.random() < 0.5 ? pairing : [pairing[1], pairing[0]]
    const sideStage: Record<Side, number> = { top: 0, right: 0, bottom: 0, left: 0 }
    for (const side of firstPair) sideStage[side] = 0
    for (const side of secondPair) sideStage[side] = 1
    const chargeDelay = STRANDS.map(() =>
      SIDES.map((side) => sideStage[side] * STAGE_GAP_MS + Math.random() * STRAND_JITTER_MS)
    )

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w === 0 || h === 0) {
        raf = requestAnimationFrame(render)
        return
      }
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'

      STRANDS.forEach((strand, si) => {
        const strokeColor = colors[strand.color]
        SIDES.forEach((side, sidei) => {
          const delay = chargeDelay[si]?.[sidei] ?? 0
          const elapsed = reduce ? GROW_MS : performance.now() - chargeStart - delay
          if (elapsed <= 0) return // hasn't started growing yet — draw nothing
          const growT = Math.min(1, elapsed / GROW_MS)
          const eased = 1 - (1 - growT) ** 3 // ease-out cubic
          const pts = sidePoints(w, h, time, strand.seed, strand.band, strand.amplitude, side)
          const visibleCount = Math.max(2, Math.ceil(eased * pts.length))
          ctx.beginPath()
          for (let i = 0; i < visibleCount; i++) {
            const p = pts[i]
            if (!p) break
            if (i === 0) ctx.moveTo(p.x, p.y)
            else ctx.lineTo(p.x, p.y)
          }
          ctx.strokeStyle = strokeColor
          ctx.shadowColor = strokeColor
          ctx.shadowBlur = 0.8
          ctx.globalAlpha = strand.alpha
          ctx.lineWidth = strand.width
          ctx.stroke()
        })
      })

      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      if (!reduce) {
        time += SPEED
        raf = requestAnimationFrame(render)
      }
    }
    raf = requestAnimationFrame(render)

    const themeObserver = new MutationObserver(() => {
      colors = readThemeColors(wrap)
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
    }
  }, [isActive])

  return (
    <span ref={wrapRef} className='relative inline-flex items-center justify-center p-2'>
      {children}
      {isActive && <canvas ref={canvasRef} className='pointer-events-none absolute inset-0 h-full w-full' />}
    </span>
  )
}
