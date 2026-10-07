'use client'

import type { RoadmapMilestone } from '@atta/cms'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Flex, Text } from '@atta/ui/shared'
import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { readThemeColors } from '../../_components/canvas/theme-colors'
import { computeTrackFrame } from '../_lib/deployment-progress'
import { attach as attachRest, getPhase, getRest, subscribe as subscribeRest } from '../_lib/rest-signal'
import { findScrollParent, scrollWeight } from '../_lib/scroll-signal'
import '../marks-motion.css'
import type { MilestoneArtwork } from '../_lib/resolve-artwork'
import { computeLanding, HarnessLanding, LANDING } from './HarnessLanding'
import { PadScreen } from './PadScreen'
import { RoadmapFabric } from './RoadmapFabric'
import { ScrollParticles } from './ScrollParticles'

// Deployment harness (designer handoff) — a scroll-linked "install" animation
// wrapping the existing card design, not a new card design. Contract from the
// handoff: three custom properties per card, staged windows over one scroll-
// derived progress value `q` — junction seats (0→0.26), spur extends
// (0.26→0.58), panel arrives (0.58→1). The tip position is a pure function of
// scroll (never a keyframe), so scrolling back rewinds it exactly.
//
// Every value that feeds `q` and the three custom properties below comes from a live
// `getBoundingClientRect()`/`offsetTop`/`offsetHeight` read taken fresh on the current
// frame, run through `computeTrackFrame` (`_lib/deployment-progress.ts`), which takes that
// geometry plus the one thing carried frame-to-frame (`lastTForVelRef`/`velTargetRef`, the
// beam's own velocity target) and returns the new state. Its own doc comment — and its
// tests — pin that `deployed` and every card's stage depend on the geometry argument alone;
// the carried history feeds only the returned velocity target, which drives cosmetic
// crackle/glow intensity below and must never feed back into `q`, `deployed`, or
// `--b`/`--a`/`--c`, or exact rewind breaks. None of this math takes a viewport width: the
// 840px split (`CONFIG.splitAbove`) only ever reorders and repositions the same DOM via CSS
// below, so a card's animated state computes identically on both sides of it by
// construction, not by convention.
//
// Every dimension below is a Tailwind class — never a `style={{}}` prop, per
// RULE 3 — and every one of them, including the arbitrary-value ones, is
// rem-based (`w-5`, `size-10`, or a `[…rem]` bracket value), never a raw `px`
// literal. This app's root is `font-size: 18px` (`packages/ui/styles/
// globals.css`), so a raw-px bracket value (e.g. `w-[20px]`) would render at a
// FIXED size while every rem-based sibling (`w-5`, `size-10`, `mb-7`) scales
// by the root's real ratio to Tailwind's 16px assumption — the two families
// drift apart and the junction/spur/beam stop lining up. Mixing them is what
// broke the connector alignment once already; every geometry value here stays
// rem so root-font-size changes (this app's own 18px, or a user's text-zoom)
// scale the whole harness together. The one sanctioned exception to "always a
// Tailwind class" is imperative: the scroll effect below writes `--b`/`--a`/
// `--c` and the beam's measured pixel height straight onto each element via
// `style.setProperty`/`style.height` — the "dynamically computed value with
// no Tailwind equivalent" case RULE 3 already carves out, done through the
// DOM rather than a JSX `style` prop so no inline style ever appears in
// markup. Colors are semantic tokens or `var(--foreground)`/`var(--background)`
// SVG presentation attributes, matching how the inlined CMS milestone marks
// theme themselves — no hardcoded colors either way.
const CONFIG = {
  beamLine: 62, // % down the viewport the beam tip rides
  spurReach: 110, // px of beam travel one card takes to fully deploy — JS-side math against
  // live-measured `offsetTop`/`offsetHeight`, already real pixels regardless of root font-size
  splitAbove: 840 // px viewport width for the two-sided layout — see max-[52.5rem]: below.
  // A media query's `rem` always resolves against the UA default (16px), never this page's
  // own `html{font-size:18px}`, so 52.5rem and 840px are the same breakpoint by definition.
}

// The head, the tube and the pad's rungs — the Claude Design handoff's `tick()` front canvas
// (draw order and numbers unchanged), except the ELECTRICITY, which is the hero harness's
// traveling-sine wave crackle (below), not the design's jagged strands. Everything is measured
// in `u`, one pad unit (the 200-unit pad SVG is 12.5rem wide, so u = 0.0625rem). The canvas covers
// the track plus `TOP_PAD` above it, so the pad's aperture and rungs (which sit above the track's
// top edge) are on it.
//
//   * a card-filled TUBE (half-width 9u, or the spur's thickness on narrow) from the aperture
//     (the deck's bottom edge, pad y 112) down to the rocket's body top, a primary side-glow
//     (alpha .06 + .16e), the wave crackle along it, and 2px walls;
//   * the three RUNGS (pad y 22 / 50 / 78), carrying the same wave crackle across them;
//   * the aperture's radial glow (radius 30u, alpha (.08 + .25e) * (active ? 1 : .4)).
//
// `e` is the scroll energy: min(1, |scroll speed| / 1200 px/s) low-passed with tau 250ms.
const TOP_PAD_REM = 8

// Narrow layout: the pad (SVG, sign and screen, rungs, aperture glow) is full size (1.0, as on
// desktop) at rest and slides from the centre to the beam's left line. The narrow beam sits at
// 4.90625rem (88.3px at the 18px root): the spur bars to the cards are half their old length
// (3.0625rem -> 1.53125rem) and the beam moved right by that saving, cards unchanged. At slide = 1
// the pad's centre is on the beam line, and its widest part, the deck slab's left edge (stroke
// included, 107.1px * scale from the centre), has to stay at least 0.5rem (9px) inside the
// viewport: 88.3 - 107.1 * scale >= 9 gives scale <= 0.741, so this is the largest scale that
// fits (0.74, leaving 9.06px), with the sign, its screen and the towers fully on screen. This is
// the scale the PAD alone shrinks TO about the aperture centre as `--slide` goes 0 -> 1
// (scale = 1 - (1 - NARROW_END_SCALE) * slide). The rocket head and the tube do NOT shrink: the
// tube stays exactly as thick as the spur bars, and starts just below the (then narrower)
// aperture like a nozzle.
const NARROW_END_SCALE = 0.74
const RUNG_Y = [22, 50, 78]

// Deterministic pseudo-random 0..1 from an int — the same formula `ElectricLabel`/
// `HarnessStructure` (the home hero's harness ring) each carry their own copy of.
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// The electricity: the hero harness's traveling-sine strands (`ElectricLabel`'s `waveOffset`),
// restored from before the design port. OFF at rest: they draw only once the reader has
// scrolled (`live`), with alpha ramped by the scroll weight; the beam's also dims as the clamps
// lock at landing. `band`/`amplitude` are px at the old 20px-wide beam, so they are scaled by
// `hw / 10` to stay inside the tube's walls at any tube width; the rungs' by `pu / u0` (the pad
// unit against its full size) to stay between the towers at any pad scale.
const CRACKLE_STRANDS = [
  { seed: 0, band: -3, amplitude: 3.2, speed: 0.05, width: 1, alpha: 0.55, color: 'primary' as const },
  { seed: 41, band: 2.6, amplitude: 2.6, speed: 0.065, width: 0.75, alpha: 0.4, color: 'primary' as const },
  { seed: 88, band: 0, amplitude: 3.8, speed: 0.042, width: 0.75, alpha: 0.35, color: 'secondary' as const }
]
const CRACKLE_STEP = 5 // px of tube length between crackle sample points
const PAD_STRAND_TEMPLATE = [
  { seed: 5, band: -1.4, amplitude: 2.2, speed: 0.05, width: 1, alpha: 0.6, color: 'primary' as const },
  { seed: 63, band: 1.2, amplitude: 1.8, speed: 0.065, width: 0.75, alpha: 0.45, color: 'primary' as const },
  { seed: 19, band: 0, amplitude: 2.6, speed: 0.045, width: 0.75, alpha: 0.35, color: 'secondary' as const }
]
const PAD_CRACKLE_STEP = 24 // sample points per rung

type Colors = ReturnType<typeof readThemeColors>

// The wave crackle along the tube, from the aperture (`y0`) to the head (`y1`), centred on it.
function drawTubeCrackle(
  ctx: CanvasRenderingContext2D,
  colors: Colors,
  cx: number,
  y0: number,
  y1: number,
  k: number,
  time: number,
  lock: number,
  scrollW: number
) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const len = y1 - y0
  for (const strand of CRACKLE_STRANDS) {
    const n = Math.max(2, Math.floor(len / CRACKLE_STEP))
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const y = y0 + (i / n) * len
      const h1 = hash01(i + strand.seed)
      const h2 = hash01(i + strand.seed + 97)
      const off =
        Math.sin(i * 0.4 - time * strand.speed + h1 * 6.283) * 0.6 +
        Math.sin(i * 1.3 - time * strand.speed * 1.8 + h2 * 6.283) * 0.4
      const x = cx + (strand.band + off * strand.amplitude) * k
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = colors[strand.color]
    ctx.shadowColor = colors[strand.color]
    ctx.shadowBlur = 2.5
    ctx.globalAlpha = strand.alpha * (1 - 0.75 * lock) * scrollW
    ctx.lineWidth = strand.width
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

// The same waves rotated 90 degrees across the three rungs: 3 strands per rung, a horizontal
// run between the towers (x +-57 pad units), seeds offset per rung so they do not crackle in
// lockstep.
function drawRungCrackle(
  ctx: CanvasRenderingContext2D,
  colors: Colors,
  cx: number,
  padV: number,
  pu: number,
  k: number,
  time: number,
  scrollW: number
) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const x0 = cx - 57 * pu
  const span = 114 * pu
  RUNG_Y.forEach((ty, tieIndex) => {
    const y = padV + ty * pu
    for (const strand of PAD_STRAND_TEMPLATE) {
      const seed = strand.seed + tieIndex * 17
      ctx.beginPath()
      for (let i = 0; i <= PAD_CRACKLE_STEP; i++) {
        const x = x0 + (i / PAD_CRACKLE_STEP) * span
        const h1 = hash01(i + seed)
        const h2 = hash01(i + seed + 97)
        const off =
          Math.sin(i * 0.5 - time * strand.speed + h1 * 6.283) * 0.6 +
          Math.sin(i * 1.6 - time * strand.speed * 1.8 + h2 * 6.283) * 0.4
        const yy = y + (strand.band + off * strand.amplitude) * k
        if (i === 0) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.strokeStyle = colors[strand.color]
      ctx.shadowColor = colors[strand.color]
      ctx.shadowBlur = 2.5
      ctx.globalAlpha = strand.alpha * scrollW
      ctx.lineWidth = strand.width
      ctx.stroke()
    }
  })
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

function drawHead(
  fc: CanvasRenderingContext2D,
  col: Colors,
  p: {
    cx: number
    pu: number
    u0: number
    apY: number
    y1: number
    hw: number
    e: number
    active: boolean
    time: number
    lock: number
    scrollW: number
    live: boolean
  }
) {
  // `u`: the head's and tube's unit; `pu`: the pad's (smaller while the narrow slide shrinks it).
  const { cx, pu, u0, apY, y1, hw, e, active, time, lock, scrollW, live } = p
  const ap = apY // canvas y of the aperture (the deck's bottom edge, pad y 112)
  const padV = ap - 112 * pu // canvas y of pad y = 0
  const y0 = ap
  fc.globalAlpha = 1
  if (y1 > y0) {
    fc.fillStyle = col.card
    fc.fillRect(cx - hw, y0, hw * 2, y1 - y0)
    if (active || e > 0.02) {
      const g = fc.createLinearGradient(cx - hw * 2.6, 0, cx + hw * 2.6, 0)
      g.addColorStop(0, 'transparent')
      g.addColorStop(0.5, col.primary)
      g.addColorStop(1, 'transparent')
      fc.globalAlpha = 0.06 + 0.16 * e
      fc.fillStyle = g
      fc.fillRect(cx - hw * 2.6, y0, hw * 5.2, y1 - y0)
    }
    // The wave crackle inside the tube: off at rest, on once the reader has scrolled.
    if (live) drawTubeCrackle(fc, col, cx, y0, y1, hw / 10, time, lock, scrollW)
    fc.globalAlpha = 1
    fc.lineWidth = 2
    fc.beginPath()
    fc.moveTo(cx - hw, y0)
    fc.lineTo(cx - hw, y1)
    fc.moveTo(cx + hw, y0)
    fc.lineTo(cx + hw, y1)
    fc.stroke()
  }
  if (live) drawRungCrackle(fc, col, cx, padV, pu, pu / u0, time, scrollW)
  const rg = fc.createRadialGradient(cx, ap, 0, cx, ap, 30 * pu)
  rg.addColorStop(0, col.primary)
  rg.addColorStop(1, 'transparent')
  fc.globalAlpha = (0.08 + 0.25 * e) * (active ? 1 : 0.4)
  fc.fillStyle = rg
  fc.fillRect(cx - 30 * pu, ap - 30 * pu, 60 * pu, 60 * pu)
  fc.globalAlpha = 1
}

const STATUS_META: Record<RoadmapMilestone['status'], { label: string; badgeClass: string }> = {
  shipping: { label: 'Shipped', badgeClass: 'text-success border-success/40' },
  planned: { label: 'Planned', badgeClass: 'text-primary border-primary/40' },
  dropped: { label: 'Dropped', badgeClass: 'border-dashed text-muted-foreground line-through' }
}

function StatusBadge({ status }: { status: RoadmapMilestone['status'] }) {
  const meta = STATUS_META[status]
  return (
    <Badge variant='outline' className={`shrink-0 font-mono text-xs font-normal ${meta.badgeClass}`}>
      {meta.label}
    </Badge>
  )
}

function MilestoneVisual({ artwork }: { artwork: MilestoneArtwork }) {
  return (
    <div
      aria-hidden
      // Icon-sized at every width: a fixed height, with the aspect ratio setting the
      // width. A full-width banner below the breakpoint made each card several times
      // taller than its desktop counterpart, so the card keeps one compact design.
      className='relative h-16 aspect-[4/3] shrink-0 overflow-hidden rounded-md border border-border bg-accent'
    >
      {artwork.kind === 'svg' ? (
        // The card's own CMS SVG, inlined so it reads the theme tokens and runs
        // `marks-motion.css`'s keyframes (an `<img>` is a separate document and could
        // do neither). `markup` was sanitized on the server (`_lib/sanitize-svg.ts`)
        // before it reached this client component. The uploaded root carries a fixed
        // `width`/`height`; `[&>svg]:size-full` alone fits it to this box via its
        // `viewBox` ONLY where the engine treats this wrapper's `aspect-[4/3]`-derived
        // height as a definite size for percentage resolution — Chromium does, but that
        // is not the reliably cross-engine part of the spec, so on an engine that
        // instead falls back to `height:auto` there, `height:100%` on this div (and in
        // turn on the injected `<svg>`) resolves to nothing, and both collapse to the
        // svg's own raw `width`/`height` attributes (e.g. 400×300) — the exact
        // "renders too large for its container" overflow this box exists to prevent.
        // `absolute inset-0` sidesteps that: an absolutely positioned box's size comes
        // from its containing block's padding box directly, a codepath every engine
        // resolves the same way regardless of how that box's own height was derived.
        // Same fix `next/image`'s `fill` (the `kind === 'image'` branch below) already
        // gets for free; this mirrors it for the inlined-SVG path by hand.
        <div
          className='absolute inset-0 [&>svg]:absolute [&>svg]:inset-0 [&>svg]:size-full'
          dangerouslySetInnerHTML={{ __html: artwork.markup }}
        />
      ) : artwork.kind === 'image' ? (
        <Image src={artwork.url} alt='' fill sizes='85px' className='object-cover' />
      ) : (
        <Flex align='center' justify='center' className='size-full text-accent-foreground'>
          <ImageIcon className='size-6' />
        </Flex>
      )}
    </div>
  )
}

// The handoff's decorative "junction" module — a hexagonal connector glyph,
// identical on every card, not a per-milestone mark. Same precedent as the
// marks above: a bespoke non-standard SVG, not a lucide icon (RULE 4 only
// bans custom SVG standing in for a STANDARD icon), themed via the same
// `var(--foreground)`/`var(--background)` presentation-attribute pattern.
function JunctionGlyph() {
  return (
    // `size-full` (CSS), never literal `width`/`height` attributes — the wrapper already
    // sizes the box via `size-10`; a fixed intrinsic size on the svg itself is exactly
    // the class of bug that put the beam's crackle off-center earlier this session
    // (`offsetLeft` vs the real transformed position) — same root cause, a size/position
    // source that doesn't track the parent's own CSS-driven box.
    <svg viewBox='0 0 40 40' className='size-full' fill='none' aria-hidden>
      <polygon
        points='20,2 35.59,11 35.59,29 20,38 4.41,29 4.41,11'
        fill='var(--background)'
        stroke='var(--foreground)'
        strokeWidth='2.2'
        strokeLinejoin='round'
      />
      <path d='M12.6 20 H27.4' stroke='var(--foreground)' strokeWidth='3' strokeLinecap='round' opacity='0.5' />
    </svg>
  )
}

export type DeploymentTrackItem = {
  id: string
  title: string
  version: string | null
  description: string
  truth: string
  status: RoadmapMilestone['status']
  artwork: MilestoneArtwork
}

export function DeploymentTrack({ items }: { items: DeploymentTrackItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const beamOuterRef = useRef<HTMLDivElement>(null)
  const beamInnerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // How far the beam has deployed, in track-local px — written every scroll frame by the
  // effect below, read every ANIMATION frame by the crackle effect further down. Two
  // separate loops on purpose: the deploy math only needs to recompute on scroll/resize,
  // but the crackle must keep shimmering continuously even while the page sits still.
  const deployedRef = useRef(0)
  const headRef = useRef<HTMLDivElement>(null)
  // The head overlay's glow disc — written imperatively by the render loop (the design's
  // `r.glow`).
  const glowRef = useRef<HTMLDivElement>(null)
  // The narrow slide (0 centred -> 1 at the beam line) and the first spur bar, whose height the
  // narrow tube matches.
  const slideRef = useRef(1)
  const lockRef = useRef(0)
  const spurRef = useRef<HTMLDivElement | null>(null)
  // Raised by the scroll effect below whenever the tip moves, decayed toward 0 every
  // animation frame by the canvas effect further down — the same "raise on input, decay
  // continuously" split `deployedRef` already uses, just for velocity instead of
  // position. `Math.max` (not `=`) so a burst of scroll ticks within one animation frame
  // doesn't get overwritten by a smaller one that lands after it.
  const velTargetRef = useRef(0)
  const lastTForVelRef = useRef<number | null>(null)
  // The landing pad's anchor (deck top) — `style.top` written by the scroll effect below.
  const landRef = useRef<HTMLDivElement>(null)
  // The track's trailing run-out — its height is written by the scroll effect below (see
  // `fitRunOut`), not fixed in a class.
  const runOutRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const track = trackRef.current
    const beamOuter = beamOuterRef.current
    const beamInner = beamInnerRef.current
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null)
    if (!track || !beamOuter || !beamInner || cards.length === 0) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // The animation reads the beam's position purely off `getBoundingClientRect`,
    // which is already viewport-relative regardless of which ancestor actually
    // scrolls — so the only scroll-container-specific thing here is which
    // element's `scroll` event to listen on (and, in `fitRunOut`, whose content end to
    // measure). `NextWebShell`'s app chrome scrolls an inner `overflow-y-auto` region,
    // not `window`, on every product this route could ship under — walk up for it
    // instead of assuming window.
    const scrollTarget: HTMLElement | Window = findScrollParent(track) ?? window
    const scrollEl = scrollTarget instanceof HTMLElement ? scrollTarget : document.documentElement

    // Sizes the trailing run-out so the page ends where the landing does. Two floors, the
    // larger wins: (1) the track reaches the bottom of the landscape, so the planet ends
    // at the track's edge and the footer follows it directly; (2) at max scroll the beam
    // line still reaches `landEnd` (L = 1), which on a tall viewport or a short footer
    // needs more track than the landscape alone. Only layout goes in — card offsets, the
    // landscape's rendered size, the viewport, the content after the track — never the
    // scroll position, so this settles to one value and the landing stays a pure
    // function of scroll. A fixed class could not do both: the deck's depth below the
    // last card follows that card's height, which the CMS copy and the viewport width set.
    function fitRunOut(deckTop: number, landEnd: number) {
      const runOut = runOutRef.current
      const landscape = landRef.current?.firstElementChild
      if (!track || !runOut || !landRef.current || !landscape || !Number.isFinite(landEnd)) return
      const trackRect = track.getBoundingClientRect()
      const groundBelowDeck = landscape.getBoundingClientRect().bottom - landRef.current.getBoundingClientRect().top
      // The scroll viewport's bottom edge and the scrollable content's end, both
      // viewport-relative; `tail` is everything after the track (the footer).
      const viewTop =
        scrollEl === document.documentElement ? 0 : scrollEl.getBoundingClientRect().top + scrollEl.clientTop
      const viewBottom = viewTop + scrollEl.clientHeight
      const tail = viewTop - scrollEl.scrollTop + scrollEl.scrollHeight - trackRect.bottom
      const line = (window.innerHeight * CONFIG.beamLine) / 100
      // At max scroll the track's bottom sits at `viewBottom - tail`, so `deployed`
      // there is `line - viewBottom + tail + trackHeight`; 2px of slack absorbs the
      // browser rounding max scroll down to a whole pixel.
      const landsAt = landEnd + Math.max(0, viewBottom - line - tail) + 2
      const target = Math.max(deckTop + groundBelowDeck, landsAt)
      const height = Math.max(0, target - runOut.offsetTop)
      if (Math.abs(runOut.offsetHeight - height) > 0.5) runOut.style.height = `${height}px`
    }

    function update() {
      if (!track || !beamOuter || !beamInner) return
      const r = track.getBoundingClientRect()
      const H = track.offsetHeight
      const line = (window.innerHeight * CONFIG.beamLine) / 100
      const [first] = cards
      if (!first) return

      // `computeTrackFrame` takes this frame's live geometry and the previous frame's
      // carried history (deployed position + velocity target) and returns the new state —
      // see its own doc comment for why `deployed`/`cardStages` can only depend on
      // `geometry`, never on `history`.
      const frame = computeTrackFrame(
        {
          reduced: still,
          trackHeight: H,
          trackTop: r.top,
          line,
          spurReach: CONFIG.spurReach,
          cardOffsets: cards.map((card) => ({ top: card.offsetTop, height: card.offsetHeight }))
        },
        { lastDeployed: lastTForVelRef.current, velTarget: velTargetRef.current }
      )

      // The landing — a pure function of the same `deployed`/`installDoneAt`, so it
      // un-lands exactly on scroll-back. `remPx` turns its rem constants into the real px
      // `deployed` is measured in.
      const remPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      const land = computeLanding(frame.deployed, frame.installDoneAt, remPx)
      // Before this frame's style writes, so its layout reads reuse the layout above.
      fitRunOut(land.deckTop, frame.installDoneAt + LANDING.approachRem * remPx)
      for (const [k, v] of Object.entries(land.vars)) track.style.setProperty(k, v)
      if (landRef.current) landRef.current.style.top = `${land.deckTop}px`
      // The landing's ambient layers (sky drift, comets) wait on this flag.
      const landedFlag = land.landed ? 'true' : 'false'
      if (track.dataset.landed !== landedFlag) track.dataset.landed = landedFlag
      // Narrow layout only (the classes below are `max-[52.5rem]:`): the pad assembly rests
      // centred and slides to the beam's left position as the reader scrolls. A pure function
      // of the scroll offset (`--slide`, 0 centred -> 1 left, smoothstep), finished at 85% of
      // the distance `s0` the page must scroll before the beam first reaches the track
      // (`r.top + scrollTop` is constant, so `s0` is a layout fact, not history). `--cx` is
      // the centred offset: half the track's width minus the beam centreline (4.90625rem on narrow, with the spur bars halved).
      // Reduced motion shows the final left position.
      const scrollTopNow = Math.max(0, scrollEl.scrollTop)
      const s0 = scrollTopNow + (r.top - line)
      const slideSpan = (s0 > 8 ? s0 : 240) * 0.85
      const slideT = still ? 1 : Math.min(1, scrollTopNow / slideSpan)
      const slide = slideT * slideT * (3 - 2 * slideT)
      slideRef.current = slide
      track.style.setProperty('--slide', slide.toFixed(4))
      track.style.setProperty('--ses', String(NARROW_END_SCALE))
      track.style.setProperty('--cx', `${(track.clientWidth / 2 - 4.90625 * remPx).toFixed(1)}px`)

      beamInner.style.height = `${H}px`
      beamOuter.style.height = `${land.headTop}px`
      deployedRef.current = land.headTop // head + crackle stop at touchdown
      lockRef.current = land.lock // `--lk`: the clamps close, the tube's current drains
      velTargetRef.current = land.landed ? 0 : frame.velTarget // glow dies at contact
      lastTForVelRef.current = frame.deployed

      cards.forEach((card, i) => {
        const stage = frame.cardStages[i]
        if (!stage) return
        card.style.setProperty('--b', stage.b.toFixed(4))
        card.style.setProperty('--a', stage.a.toFixed(4))
        card.style.setProperty('--c', stage.c.toFixed(4))
      })
    }

    let queued = false
    function onFrame() {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        update()
      })
    }

    scrollTarget.addEventListener('scroll', onFrame, { passive: true })
    window.addEventListener('resize', onFrame)
    const resizeObserver = new ResizeObserver(onFrame)
    resizeObserver.observe(track)
    update()

    return () => {
      scrollTarget.removeEventListener('scroll', onFrame)
      window.removeEventListener('resize', onFrame)
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const track = trackRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const head = headRef.current
    if (!track || !canvas || !ctx || !head) return

    let colors = readThemeColors(canvas)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const narrow = window.matchMedia('(max-width: 52.5rem)')
    const scrollTarget: HTMLElement | Window = findScrollParent(track) ?? window
    const scrollEl = scrollTarget instanceof HTMLElement ? scrollTarget : document.documentElement
    let raf = 0
    let lastT = 0
    let lastS = scrollEl.scrollTop
    let e = 0 // scroll energy: min(1, |px/s| / 1200), low-passed with tau 250ms
    let noise = 0.5 // the rocket glow's low-passed noise (tau 400ms)
    // Motion cues (design): streaks are the speed lines beside the body. They are a result of
    // speed only (see `mv` below): none at rest, none while the rocket is not moving, none once landed.
    let spawnAcc = 0
    let streaks: Array<{ x: number; y: number; len: number; life: number; a: number }> = []
    // The electricity (hero-harness wave crackle) is off at rest: `scrollW` eases the scroll
    // weight (0 at the top, 1 past 70px) and gates and ramps it. Reduced motion keeps the old
    // behaviour: fully on wherever the beam has deployed, one still frame (`time` never advances).
    let scrollW = reduce ? 1 : 0
    let time = 0

    // One frame of the design's `tick()` for the head: the idle group, the glow, then the
    // front canvas (tube, rungs, aperture glow). The head's own `top` is `deployed` from the
    // scroll effect (`computeTrackFrame` / `computeLanding`), unchanged.
    const render = (now: number) => {
      const dt = Math.min(0.1, (now - (lastT || now)) / 1000) || 0.016
      lastT = now
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w > 0 && h > 0 && (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr))) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const remPx = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      // `u0`: one pad unit (0.0625rem). `sc`: the narrow slide's optional shrink (1 by default),
      // about the aperture; `u` is the scaled unit the pad and head are drawn at.
      const isNarrow = narrow.matches
      const sc = isNarrow ? 1 - (1 - NARROW_END_SCALE) * slideRef.current : 1
      const u0 = 0.0625 * remPx
      const u = u0 // the head's and tube's unit: never shrinks
      const pu = u0 * sc // the pad's unit (rungs, aperture glow)
      // Narrow: the tube is exactly as thick as the spur bars out to the cards (`h-5`, 1.25rem,
      // measured off the first spur); desktop keeps the design's 9u half-width.
      const spurH = spurRef.current?.offsetHeight || 1.25 * remPx
      const hw = isNarrow ? spurH / 2 : 9 * u
      const s = scrollEl.scrollTop
      const v = Math.abs(s - lastS) / dt
      lastS = s
      e += (Math.min(1, v / 1200) - e) * (1 - Math.exp(-dt / 0.25))
      const energy = reduce ? 0 : e
      const rest = getRest(now)
      const active = getPhase() !== 'idle'
      const t = reduce ? 0 : now / 1000

      // The glow is low-passed noise (tau 400ms), .55 to .70, scaled by `rest`; static .62 reduced.
      // Nothing else idles at the nose (the design removed its idle lines and ripple arcs).
      noise += (Math.random() - noise) * (1 - Math.exp(-dt / 0.4))
      if (glowRef.current) glowRef.current.style.opacity = (rest * (reduce ? 0.62 : 0.55 + 0.15 * noise)).toFixed(3)

      const deployed = deployedRef.current
      head.style.top = `${deployed}px`
      // The head's x in track space (it is translated by the narrow layout's slide), so the
      // tube and rungs are drawn where the pad really is.
      const cx = head.getBoundingClientRect().left - track.getBoundingClientRect().left
      scrollW = reduce ? 1 : scrollW + (scrollWeight(s) - scrollW) * 0.12
      drawHead(ctx, colors, {
        cx,
        pu,
        u0,
        apY: TOP_PAD_REM * remPx - 12 * u0,
        y1: TOP_PAD_REM * remPx + deployed + 4 * u,
        hw,
        e: energy,
        active,
        time,
        lock: lockRef.current,
        scrollW,
        live: deployed > 0 && scrollW > 0.02
      })

      // Motion cues, drawn after the tube, rungs and aperture (design `tick()`): speed streaks
      // beside the body and a two-arc bow shock hugging the nose. They are driven by scroll speed
      // ALONE (no cruise floor, unlike the design): absent at rest, absent whenever the rocket is
      // not moving (the reader stopped scrolling), and absent after landing; they ease out with
      // the 250ms low-pass on `e` when scrolling stops.
      // `nose` is the rocket's tip: the head anchor + 72u (body top at +4u, tip 68u below it).
      const landed = track.dataset.landed === 'true'
      const nose = deployed + 72 * u + TOP_PAD_REM * remPx
      const mv = reduce || !active || landed ? 0 : Math.max(0, (e - 0.04) / 0.96)
      if (mv > 0) {
        spawnAcc += dt * (4 + 14 * mv)
        while (spawnAcc > 1) {
          spawnAcc -= 1
          const side = Math.random() < 0.5 ? -1 : 1
          streaks.push({
            x: side * (16 + Math.random() * 20) * u,
            y: nose + (Math.random() * 30 - 6) * u,
            len: (8 + 22 * mv) * u,
            life: 0,
            a: 0.25 + 0.35 * mv
          })
        }
      }
      ctx.strokeStyle = colors.foreground
      ctx.lineCap = 'round'
      ctx.lineWidth = 1.5
      streaks = streaks.filter((q) => {
        q.life += dt
        q.y -= (260 + 900 * mv) * dt
        const f = q.life / 0.6
        if (f >= 1) return false
        ctx.globalAlpha = q.a * Math.sin(Math.PI * f)
        ctx.beginPath()
        ctx.moveTo(cx + q.x, q.y)
        ctx.lineTo(cx + q.x, q.y + q.len)
        ctx.stroke()
        return true
      })
      if (mv > 0.02) {
        for (const [i, [dy, hw0, a]] of (
          [
            [5, 12, 0.55],
            [13, 20, 0.32]
          ] as const
        ).entries()) {
          const hw = (hw0 + 10 * mv + 1.5 * Math.sin(t * 9 + i * 2)) * u
          const y = nose + dy * u
          const lift = (8 + 8 * mv) * u
          ctx.globalAlpha = a * Math.min(1, mv * 1.6)
          ctx.beginPath()
          ctx.moveTo(cx - hw, y - lift)
          ctx.quadraticCurveTo(cx, y + lift * 0.9, cx + hw, y - lift)
          ctx.stroke()
        }
      }
      ctx.lineCap = 'butt'
      ctx.globalAlpha = 1

      if (!reduce) {
        time += 1
        raf = requestAnimationFrame(render)
      }
    }
    raf = requestAnimationFrame(render)

    // Reduced motion draws still frames, so redraw when the head moves or the rest state changes.
    const rerender = () => render(performance.now())
    if (reduce) {
      scrollTarget.addEventListener('scroll', rerender, { passive: true })
      window.addEventListener('resize', rerender)
    }
    const unsubscribeRest = subscribeRest(() => {
      if (reduce) rerender()
    })

    const themeObserver = new MutationObserver(() => {
      colors = readThemeColors(canvas)
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const detachRest = attachRest(track)

    return () => {
      detachRest()
      unsubscribeRest()
      cancelAnimationFrame(raf)
      scrollTarget.removeEventListener('scroll', rerender)
      window.removeEventListener('resize', rerender)
      themeObserver.disconnect()
    }
  }, [])

  return (
    // Full-bleed outer, same split home's own full-width sections use (`page.tsx`'s
    // `#next-steps`): the fabric canvas is clipped to THIS box's bottom, so it spans the
    // whole viewport regardless of screen width, while `trackRef` below constrains the
    // beam/cards to a readable column. A single `max-w-5xl` wrapper around both would put
    // the fabric behind the same gutter as the text, which is exactly the "still has x
    // padding" the outer max-w previously produced. No bottom padding: the track's own
    // run-out (see `fitRunOut`) ends it at the landscape's bottom, and `-mb-8` cancels
    // `page.tsx`'s `py-8` bottom so the planet meets the footer's rule directly.
    <div className='relative w-full -mb-8'>
      {/* The roadmap's own fabric — a perspective grid with a slow shimmer, visible from the
          first frame (see `RoadmapFabric.tsx`; the shared `EnergyFieldBg` is not used here).
          Mounted FIRST so every later sibling (particles, beam, canvas, head, cards) paints
          over it. */}
      <RoadmapFabric />
      {/* Square particles drifting over the fabric with parallax — a viewport-fixed canvas,
          mounted before the track so the beam, head and cards paint over it. */}
      <ScrollParticles />
      <div ref={trackRef} data-landed='false' className='relative mx-auto max-w-5xl mt-56'>
        {/* The launchpad — ported from the designer's own isolated reference file, same
          precedent as the head. STRUCTURE, not animation: drawn fully at rest (no deploy
          fade), because the page would otherwise read as having no origin until scrolled.
          Its only moving part is the aperture glow, driven by the SAME `--v` the head
          reads — set on `track` (a shared ancestor of this and `headRef`) by the canvas
          effect above, so the two stay in sync with zero bookkeeping here. Must come
          BEFORE the beam in source so the beam paints over the deck's aperture gap
          instead of under it. */}
        <div
          aria-hidden
          className='pointer-events-none absolute top-0 left-1/2 size-0 max-[52.5rem]:left-[4.90625rem] max-[52.5rem]:translate-x-[calc((1-var(--slide,1))*var(--cx,0px))] max-[52.5rem]:scale-[calc(1-(1-var(--ses,1))*var(--slide,1))] max-[52.5rem]:[transform-origin:0_-0.75rem]'
        >
          <svg
            // `0 -58 200 182`: the original 200x124 pad (every coordinate below unchanged)
            // plus 58 units above it for the sign. Same width and bottom edge, so the
            // 11.375rem box grows upward only. No static rungs or scorch: the rungs between the
            // towers and the aperture's glow are drawn on the front canvas (`drawHead`).
            viewBox='0 -58 200 182'
            className='absolute top-[-11.375rem] left-[-6.25rem] h-[11.375rem] w-[12.5rem] origin-bottom'
            fill='none'
          >
            {/* the sign above the towers: a conduit down into the left tower, two short
              posts (centred on the towers' x 34 and 166), and the sign itself; the live
              screen is `PadScreen`, laid over this rect */}
            <path d='M22 -36 H14 V30 H26' stroke='var(--foreground)' strokeWidth='1.5' opacity='0.6' />
            <rect x='30' y='-10' width='8' height='16' fill='var(--card)' stroke='var(--foreground)' strokeWidth='2' />
            <rect x='162' y='-10' width='8' height='16' fill='var(--card)' stroke='var(--foreground)' strokeWidth='2' />
            <path d='M30 -2 H38 M162 -2 H170' stroke='var(--foreground)' strokeWidth='1' opacity='0.5' />
            <rect
              x='22'
              y='-54'
              width='156'
              height='44'
              rx='3'
              fill='var(--card)'
              stroke='var(--foreground)'
              strokeWidth='2'
            />
            {/* service towers */}
            <rect x='26' y='6' width='16' height='90' fill='var(--card)' stroke='var(--foreground)' strokeWidth='2' />
            <rect x='158' y='6' width='16' height='90' fill='var(--card)' stroke='var(--foreground)' strokeWidth='2' />
            {/* hold-down clamps, already released and swung clear of the beam */}
            <path
              d='M88 98 L74 90 V82 M112 98 L126 90 V82'
              stroke='var(--foreground)'
              strokeWidth='2.2'
              strokeLinejoin='miter'
            />
            {/* deck, in two slabs — the 20-unit gap between them IS the aperture, matched to
              the beam's own 20px width; change one, change both */}
            <rect x='6' y='96' width='84' height='16' fill='var(--card)' stroke='var(--foreground)' strokeWidth='2.4' />
            <rect
              x='110'
              y='96'
              width='84'
              height='16'
              fill='var(--card)'
              stroke='var(--foreground)'
              strokeWidth='2.4'
            />
            {/* the accent slot the junction modules and the rocket nose also carry */}
            <path d='M22 104 H50 M150 104 H178' stroke='var(--primary)' strokeWidth='3.2' strokeLinecap='round' />
            {/* footings */}
            <path d='M22 112 L10 122 M178 112 L190 122' stroke='var(--foreground)' strokeWidth='2.2' />
          </svg>
          {/* The live screen inside the sign above the towers — see `PadScreen.tsx`. */}
          <PadScreen />
        </div>
        {/* The landing pad + planet surface — mounted before the beam so the nose paints
          over the deck. See `HarnessLanding.tsx`. */}
        <HarnessLanding ref={landRef} />
        <div
          ref={beamOuterRef}
          aria-hidden
          className='pointer-events-none absolute top-0 left-1/2 h-0 w-5 -translate-x-1/2 overflow-hidden max-[52.5rem]:left-[4.28125rem] max-[52.5rem]:translate-x-0'
        >
          <div ref={beamInnerRef} className='absolute top-0 left-0 h-0 w-5' />
        </div>

        {/* The head — the Claude Design handoff's overlay, 1:1: an `0.0625rem`-per-unit SVG
          (viewBox -60 -4 160 116) with the card-filled rocket, its fins, nose band and cockpit
          slot and, behind it, a soft glow disc (no idle lines: the design removed them). A zero-size anchor riding the head's tip
          (`top` written imperatively by the canvas effect; on the narrow layout it is also
          translated by the slide). The body's top edge sits 4 units below the anchor, which is
          where the tube ends. Half size narrow, like the pad. */}
        <div
          ref={headRef}
          aria-hidden
          className='pointer-events-none absolute top-0 left-1/2 size-0 max-[52.5rem]:left-[4.90625rem] max-[52.5rem]:translate-x-[calc((1-var(--slide,1))*var(--cx,0px))]'
        >
          <div className='absolute top-[-0.125rem] left-[-5rem] h-[7.25rem] w-[10rem] origin-[50%_1.72%]'>
            <div
              ref={glowRef}
              className='absolute top-[62%] left-1/2 aspect-square w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--foreground)_9%,transparent),transparent)]'
            />
            <svg
              viewBox='-60 -4 160 116'
              className='relative block w-full overflow-visible'
              fill='none'
              stroke='var(--foreground)'
              strokeWidth='2'
            >
              <path d='M12 2 H28 V40 L20 70 L12 40 Z' fill='var(--card)' vectorEffect='non-scaling-stroke' />
              <path d='M12 24 L5 33 V42 L12 37' fill='var(--card)' vectorEffect='non-scaling-stroke' />
              <path d='M28 24 L35 33 V42 L28 37' fill='var(--card)' vectorEffect='non-scaling-stroke' />
              <line x1='12' y1='8' x2='28' y2='8' strokeWidth='1' opacity='0.4' vectorEffect='non-scaling-stroke' />
              <line
                x1='16'
                y1='26'
                x2='24'
                y2='26'
                strokeWidth='3'
                strokeLinecap='round'
                vectorEffect='non-scaling-stroke'
              />
            </svg>
          </div>
        </div>

        {/* The front canvas: the tube from the aperture to the head, the rungs and the aperture
          glow (`drawHead`). It covers the track plus 8rem above it, where the pad's aperture
          and rungs sit. The beam is only a measuring box now; the tube replaces its rail. Mounted AFTER the head so the motion cues (speed streaks, bow shock) paint over the head's card-filled body. */}
        <canvas
          ref={canvasRef}
          aria-hidden
          className='pointer-events-none absolute top-[-8rem] left-0 h-[calc(100%+8rem)] w-full'
        />

        {items.map((item, i) => {
          const side = i % 2 === 0 ? 'right' : 'left'
          return (
            <div
              key={item.id}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              data-side={side}
              // One geometry, mirrored — every child below is written ONCE, as the
              // 'right' layout, and this wrapper flips the whole card horizontally for
              // 'left' via `scaleX(-1)`. Two independently hand-typed left/right offset
              // strings is exactly what let the spur drift out of sync with the junction
              // on one side while the other stayed correct — a mirror transform makes
              // that class of bug structurally impossible: there is only one formula left
              // to get right. The junction (a symmetric hexagon) and spur (a symmetric
              // bar) need no correction under the flip; only the panel's actual reading
              // content does, and it un-mirrors itself below.
              //
              // `min-[52.5rem]:` scopes the mirror to desktop only — below that breakpoint
              // the beam is single-sided (moved to the left gutter, per the handoff), so
              // EVERY card deploys to its right regardless of `side`; only at desktop,
              // where the beam runs down the center with two-sided cards, does alternating
              // left/right make sense at all.
              className={cn('relative mb-7', side === 'left' && 'min-[52.5rem]:[transform:scaleX(-1)]')}
            >
              <div
                aria-hidden
                // `max-[52.5rem]:left-[4.90625rem]` is the beam's own mobile CENTERLINE, not
                // its left edge — the beam is a narrow `w-5` (1.25rem) box at
                // `left-[2.75rem]`, so its center sits at 2.75rem + 1.25rem/2 = 3.375rem.
                // That centerline is set by the widest thing hanging off it, the launchpad:
                // its `scale-50` deck is 6.25rem wide, so a 3.125rem half-width plus a
                // 0.25rem margin keeps the pad (and the narrower rocket nose) inside the
                // viewport's left edge — a centerline hugging the gutter clips them, and
                // the page's `overflow-x-hidden` hides that as a cut-off, not a scrollbar.
                // A first pass copied the beam's left offset verbatim onto this box, which matched
                // their LEFT EDGES instead of their centers — fine for the beam's own
                // narrow width, but this wrapper is a much wider `size-10` (2.5rem) box, so
                // matching left edges pushed its true center well to the right of the beam.
                // `-translate-x-1/2` stays active at every breakpoint (only the anchor
                // changes) so a wide box centers on a POINT the same way it does on
                // desktop, rather than left-aligning to one.
                className='absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 opacity-[var(--b,0)] scale-[calc(0.74+0.26*var(--b,0))] max-[52.5rem]:left-[4.90625rem] motion-reduce:scale-100 motion-reduce:opacity-100'
              >
                <JunctionGlyph />
              </div>

              <div
                aria-hidden
                // 0.974375rem = the hexagon's OWN real half-width: its polygon spans
                // x∈[4.41,35.59] of a 40-unit viewBox inside a `size-10` (2.5rem) wrapper,
                // so half-width = (35.59-4.41)/40 * 2.5rem. Fixing `JunctionGlyph` to size
                // via `size-full` instead of a literal `width`/`height` attribute (a real
                // rendering bug, not just a measurement one — see the earlier reference
                // memory) grew the hex's true rendered size, and this offset — tuned
                // against the old, too-small render — started overlapping into it.
                // Deriving it from the polygon's own coordinates instead of a tuned
                // constant is what keeps this from drifting out of sync again. The mobile
                // value is the SAME hex half-width added to the beam's mobile centerline
                // (3.375rem, see the junction wrapper above) — the hex's real size doesn't
                // change between breakpoints, only where the beam's centerline sits does.
                // The mobile spur length is what's left between that start and the panel's
                // fixed margin, so moving the centerline never moves or narrows the cards.
                ref={i === 0 ? spurRef : undefined}
                className='pointer-events-none absolute top-1/2 left-[calc(50%+0.974375rem)] h-5 -translate-y-1/2 overflow-hidden [--spur-len:2.9375rem] w-[calc(var(--spur-len)*var(--a,0))] max-[52.5rem]:left-[5.880625rem] max-[52.5rem]:[--spur-len:1.53125rem] motion-reduce:w-[var(--spur-len)]'
              >
                <div className='absolute top-0 left-0 h-5 w-[var(--spur-len)] border-y-2 border-foreground bg-[repeating-linear-gradient(to_right,var(--foreground)_0_1px,transparent_1px_26px)]' />
              </div>

              <div
                className={cn(
                  // Fade only, no slide — the panel's own position is fixed by its margin
                  // below; `--c` drives just opacity, never a translate.
                  'opacity-[var(--c,0)] motion-reduce:opacity-100',
                  // Panel margin = spur's own start offset (0.974375rem desktop /
                  // 4.349375rem mobile) + its length (2.9375rem desktop / 3.0625rem
                  // mobile) — derived from the SAME geometry the spur itself uses, not an
                  // approximated constant, so the panel always lands exactly where the
                  // spur ends instead of leaving a gap.
                  'ml-[calc(50%+3.911875rem)] max-[52.5rem]:ml-[7.411875rem]',
                  // Below the breakpoint the panel would otherwise run from the spur to the
                  // viewport's right edge — ~700px wide just under 840px, and flush against
                  // the edge on a phone. `max-w-[24rem]` keeps it a compact reading column
                  // and `mr-4` keeps a gutter.
                  'max-[52.5rem]:mr-4 max-[52.5rem]:max-w-[24rem]',
                  // Un-mirror just the panel's own rendering — its LAYOUT POSITION (the
                  // margin above) still comes from the flipped ancestor, which is what
                  // lands it on the correct side; only its painted content (the Card and
                  // its text) needs to read normally rather than mirrored. Scoped to
                  // `min-[52.5rem]:` for the same reason the ancestor's mirror is — below
                  // that breakpoint there's no flip to undo.
                  side === 'left' && 'min-[52.5rem]:[transform:scaleX(-1)]'
                )}
              >
                <Card>
                  <CardHeader>
                    {/* Icon beside the title at every width. Only on a narrow phone
                      (under 480px), where the icon would squeeze the title to a sliver,
                      does the icon stack above the title instead. */}
                    <Flex align='center' gap={4} className='max-[30rem]:flex-col max-[30rem]:items-start'>
                      <MilestoneVisual artwork={item.artwork} />
                      <Flex direction='column' gap={1} className='min-w-0'>
                        <CardTitle
                          className={`font-serif text-xl font-normal text-foreground ${
                            item.status === 'dropped' ? 'line-through' : ''
                          }`}
                        >
                          {item.title}
                        </CardTitle>
                        <Flex align='center' gap={2}>
                          {/* No version yet = not rendered — a version is a record of what
                            shipped, never a target/prediction (see the schema's own
                            description); an unshipped milestone has none to show. */}
                          {item.version && (
                            <Text as='span' className='font-mono text-xs text-muted-foreground'>
                              v{item.version}
                            </Text>
                          )}
                          <StatusBadge status={item.status} />
                        </Flex>
                      </Flex>
                    </Flex>
                  </CardHeader>
                  {/* `pt-0` in-surface, not a shared `@atta/ui` edit — the animate library's
                      `CardContent` wrapper adds its own `pt-6` regardless of a preceding
                      `CardHeader` (which already carries a bottom `p-6`), producing a real
                      double-padding gap on this specific card layout. Caller className wins
                      over the wrapper's `pt-6` via tailwind-merge, per that wrapper's own
                      doc comment, so this fixes it locally without touching the shared
                      component every other `@atta/ui` consumer renders through. */}
                  <CardContent className='flex flex-col gap-3 pt-0'>
                    <Text as='p' className='font-sans text-sm text-muted-foreground'>
                      {item.description}
                    </Text>
                    <Text as='p' className='border-l-2 border-border pl-3 font-sans text-sm text-foreground'>
                      {item.truth}
                    </Text>
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        })}

        {/* The run-out — room for the landing's approach and the planet under the pad. Its
          height is set by `fitRunOut`; the classes are only the pre-hydration estimate. */}
        <div ref={runOutRef} aria-hidden className='h-[28.5rem] max-[52.5rem]:h-[16.5rem]' />
      </div>
    </div>
  )
}
