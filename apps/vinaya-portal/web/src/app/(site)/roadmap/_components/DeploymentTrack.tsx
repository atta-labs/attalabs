'use client'

import type { RoadmapMilestone } from '@atta/cms'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Flex, Text } from '@atta/ui/shared'
import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { readThemeColors } from '../../_components/canvas/theme-colors'
import { EnergyFieldBg } from '../../_components/EnergyFieldBg'
import '../marks-motion.css'
import MilestoneLayerMark from '../_marks/0.19.0-milestone-layer.svg'
import DeterminismHardeningMark from '../_marks/0.20.0-determinism-hardening.svg'
import AgenticInterfaceMark from '../_marks/0.21.0-agentic-interface.svg'
import ReviewThatAnswersItselfMark from '../_marks/0.22.0-review-that-answers-itself.svg'
import TaskFinishesItselfMark from '../_marks/0.23.0-task-finishes-itself.svg'
import TrancheFinishesItselfMark from '../_marks/0.24.0-tranche-finishes-itself.svg'
import MilestoneFinishesItselfMark from '../_marks/1.0.0-milestone-finishes-itself.svg'

// Deployment harness (designer handoff) — a scroll-linked "install" animation
// wrapping the existing card design, not a new card design. Contract from the
// handoff: three custom properties per card, staged windows over one scroll-
// derived progress value `q` — junction seats (0→0.26), spur extends
// (0.26→0.58), panel arrives (0.58→1). The tip position is a pure function of
// scroll (never a keyframe), so scrolling back rewinds it exactly.
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
// SVG presentation attributes, matching how the milestone marks above already
// theme themselves — no hardcoded colors either way.
const CONFIG = {
  beamLine: 62, // % down the viewport the beam tip rides
  spurReach: 110, // px of beam travel one card takes to fully deploy — JS-side math against
  // live-measured `offsetTop`/`offsetHeight`, already real pixels regardless of root font-size
  splitAbove: 840 // px viewport width for the two-sided layout — see max-[52.5rem]: below.
  // A media query's `rem` always resolves against the UA default (16px), never this page's
  // own `html{font-size:18px}`, so 52.5rem and 840px are the same breakpoint by definition.
}

// Deterministic pseudo-random 0..1 from an int — same formula `ElectricLabel`/
// `HarnessStructure` (the home hero's harness ring) each already carry their own copy
// of, not shared: every canvas-electricity component in this app owns this one line
// rather than importing it, which is the established precedent here.
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// The beam-current strands — same traveling-sine shape as `ElectricLabel`'s `waveOffset`,
// ported from a closed border loop to an open vertical run: no envelope pinning to 0 at
// the ends (there's no seam to close), just a continuous jag from y=0 to the deployed tip.
// `band` is each strand's resting x-offset (px) from the beam centerline; kept well inside
// the beam's own 20px width so the crackle reads as current IN the rail, not spilling past it.
const CRACKLE_STRANDS = [
  { seed: 0, band: -3, amplitude: 3.2, speed: 0.05, width: 1, alpha: 0.55, color: 'primary' as const },
  { seed: 41, band: 2.6, amplitude: 2.6, speed: 0.065, width: 0.75, alpha: 0.4, color: 'primary' as const },
  { seed: 88, band: 0, amplitude: 3.8, speed: 0.042, width: 0.75, alpha: 0.35, color: 'secondary' as const }
]
const CRACKLE_STEP = 5 // px of beam travel between crackle sample points

// The head — a designer-supplied reference implementation (`The Head -
// isolated.html`), ported verbatim rather than re-derived: a `<div>`/`<svg>`
// DOM structure (see the JSX below), not canvas — the head is a STATIC shape
// (no wobble, no re-tuning risk) layered with CSS `opacity`/`scale` driven by
// one custom property, `--v` (0 at rest, 1 moving fast), which the effect
// below writes every animation frame. Canvas keeps only what genuinely needs
// per-frame redrawing: the shimmering current strands and the sealed end cap.
const HEAD_HIDE_MARGIN = 50 // px of remaining track over which the head fades out at the bottom

function drawCrackle(
  ctx: CanvasRenderingContext2D,
  colors: ReturnType<typeof readThemeColors>,
  beamX: number,
  deployed: number,
  time: number
) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  for (const strand of CRACKLE_STRANDS) {
    const n = Math.max(2, Math.floor(deployed / CRACKLE_STEP))
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const y = (i / n) * deployed
      const h1 = hash01(i + strand.seed)
      const h2 = hash01(i + strand.seed + 97)
      const off =
        Math.sin(i * 0.4 - time * strand.speed + h1 * 6.283) * 0.6 +
        Math.sin(i * 1.3 - time * strand.speed * 1.8 + h2 * 6.283) * 0.4
      const x = beamX + strand.band + off * strand.amplitude
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = colors[strand.color]
    ctx.shadowColor = colors[strand.color]
    ctx.shadowBlur = 2.5
    ctx.globalAlpha = strand.alpha
    ctx.lineWidth = strand.width
    ctx.stroke()
  }
  ctx.shadowBlur = 0
}

// The launchpad's three cross-ties, energized — same traveling-sine shimmer as
// `CRACKLE_STRANDS`/`drawCrackle` above (the beam's own current), just rotated 90°: a
// horizontal jag along each tie instead of a vertical one along the beam. `yFrac`/`xFrac`
// are fractions of the pad SVG's own `0 0 200 124` viewBox (the tie y-positions 26/54/82
// and their shared x-span 42–158), so the strand tracks the static tie line exactly at
// any rendered size. Drawn only while `deployed > 0` (the same gate `drawCrackle` runs
// under) — flat and inert at rest, current only once the harness has actually started
// moving, which is the literal "as we scroll they become electricity" ask.
const PAD_CRACKLE_ROWS = [
  { yFrac: 26 / 124, seed: 5, amplitude: 2.2, speed: 0.05, width: 1, alpha: 0.6, color: 'primary' as const },
  { yFrac: 54 / 124, seed: 63, amplitude: 2.6, speed: 0.06, width: 0.85, alpha: 0.5, color: 'primary' as const },
  { yFrac: 82 / 124, seed: 19, amplitude: 2, speed: 0.045, width: 0.75, alpha: 0.4, color: 'secondary' as const }
]
const PAD_CRACKLE_X0_FRAC = 42 / 200
const PAD_CRACKLE_X1_FRAC = 158 / 200
const PAD_CRACKLE_STEP = 24 // sample points per tie — the ties are short, so a fixed count reads smoother than CRACKLE_STEP's per-pixel sampling

function drawPadCrackle(
  ctx: CanvasRenderingContext2D,
  colors: ReturnType<typeof readThemeColors>,
  w: number,
  h: number,
  time: number
) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  const x0 = PAD_CRACKLE_X0_FRAC * w
  const x1 = PAD_CRACKLE_X1_FRAC * w
  const span = x1 - x0

  for (const row of PAD_CRACKLE_ROWS) {
    const y = row.yFrac * h
    ctx.beginPath()
    for (let i = 0; i <= PAD_CRACKLE_STEP; i++) {
      const x = x0 + (i / PAD_CRACKLE_STEP) * span
      const h1 = hash01(i + row.seed)
      const h2 = hash01(i + row.seed + 97)
      const off =
        Math.sin(i * 0.5 - time * row.speed + h1 * 6.283) * 0.6 +
        Math.sin(i * 1.6 - time * row.speed * 1.8 + h2 * 6.283) * 0.4
      const yy = y + off * row.amplitude
      if (i === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.strokeStyle = colors[row.color]
    ctx.shadowColor = colors[row.color]
    ctx.shadowBlur = 2.5
    ctx.globalAlpha = row.alpha
    ctx.lineWidth = row.width
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}

const MARK_BY_VERSION: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  '0.19.0': MilestoneLayerMark,
  '0.20.0': DeterminismHardeningMark,
  '0.21.0': AgenticInterfaceMark,
  '0.22.0': ReviewThatAnswersItselfMark,
  '0.23.0': TaskFinishesItselfMark,
  '0.24.0': TrancheFinishesItselfMark,
  '1.0.0': MilestoneFinishesItselfMark
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

function MilestoneVisual({ version, image }: { version: string; image: RoadmapMilestone['image'] }) {
  const Mark = MARK_BY_VERSION[version]
  // `MARK_BY_VERSION` is hand-typed against the 7 versions this ladder currently
  // ships, with no link back to the CMS's free-text `version` field — an editor
  // typo (or a genuinely new milestone) silently falls through to the generic
  // placeholder below with no signal anywhere that a mark is missing.
  if (!Mark && process.env.NODE_ENV !== 'production') {
    console.warn(`[roadmap] no mark registered for version "${version}" in MARK_BY_VERSION`)
  }

  return (
    <div
      aria-hidden
      // Icon-sized (fixed height, aspect-ratio sets the width) at desktop; below the
      // harness breakpoint it becomes a full-width banner instead (height following
      // width via the same aspect-ratio) — the marks are 4:3 rectangles on purpose so
      // they read well at that size, not just as a cropped icon.
      className='relative h-16 aspect-[4/3] shrink-0 overflow-hidden rounded-md border border-border bg-accent max-[52.5rem]:h-auto max-[52.5rem]:w-full max-[52.5rem]:shrink'
    >
      {Mark ? (
        <Mark className='mm size-full' />
      ) : image?.url ? (
        <Image src={image.url} alt='' fill sizes='85px' className='object-cover' />
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
  version: string
  description: string
  truth: string
  status: RoadmapMilestone['status']
  image: RoadmapMilestone['image']
}

export function DeploymentTrack({ items }: { items: DeploymentTrackItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const beamOuterRef = useRef<HTMLDivElement>(null)
  const beamInnerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // A second, small canvas scoped to the launchpad's own footprint — its cross-ties sit
  // ABOVE `trackRef`'s own top edge (negative offset, same anchor `headRef` hangs off), so
  // they fall outside the main canvas's `inset-0` box. Kept separate rather than growing
  // the main canvas upward: that would mean re-deriving every beam/head coordinate the
  // main render loop already writes in track-local (not pad-local) space.
  const padCanvasRef = useRef<HTMLCanvasElement>(null)
  // How far the beam has deployed, in track-local px — written every scroll frame by the
  // effect below, read every ANIMATION frame by the crackle effect further down. Two
  // separate loops on purpose: the deploy math only needs to recompute on scroll/resize,
  // but the crackle must keep shimmering continuously even while the page sits still.
  const deployedRef = useRef(0)
  // The `deployed` value at which the LAST card finishes arriving (its own `--c` hits
  // 1) — not the track's raw pixel height, which runs well past that point (the
  // `h-[11.25rem]` run-out exists so the beam can keep growing while the last card's
  // spur/panel animate in; scroll physically maxes out before `deployed` ever reaches
  // it). "Touching bottom" for the nose cone means the harness has nothing left to
  // install, which is this threshold, not the track's total height.
  const installDoneAtRef = useRef(Number.POSITIVE_INFINITY)
  const headRef = useRef<HTMLDivElement>(null)
  // Wraps glow/plume/atmosphere only — NOT the nose — so the two can fade independently:
  // the rocket stays fully drawn once deployment starts, the atmosphere around it fades
  // out once installation completes.
  const atmoRef = useRef<HTMLDivElement>(null)
  // The fabric background — invisible at rest, fades IN once the rocket starts moving
  // (the same `deployed > 8` start gate the head itself uses) and stays on rather than
  // flickering with every velocity change, since it's an ambient backdrop, not a
  // speed-reactive effect like the atmosphere.
  const fabricRef = useRef<HTMLDivElement>(null)
  // Raised by the scroll effect below whenever the tip moves, decayed toward 0 every
  // animation frame by the canvas effect further down — the same "raise on input, decay
  // continuously" split `deployedRef` already uses, just for velocity instead of
  // position. `Math.max` (not `=`) so a burst of scroll ticks within one animation frame
  // doesn't get overwritten by a smaller one that lands after it.
  const velTargetRef = useRef(0)
  const lastTForVelRef = useRef<number | null>(null)

  useEffect(() => {
    const track = trackRef.current
    const beamOuter = beamOuterRef.current
    const beamInner = beamInnerRef.current
    const cards = cardRefs.current.filter((el): el is HTMLDivElement => el !== null)
    if (!track || !beamOuter || !beamInner || cards.length === 0) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

    function update() {
      if (!track || !beamOuter || !beamInner) return
      const r = track.getBoundingClientRect()
      const H = track.offsetHeight

      const line = (window.innerHeight * CONFIG.beamLine) / 100
      const [first] = cards
      if (!first) return
      const t = still ? H : Math.max(0, Math.min(H, line - r.top))

      beamInner.style.height = `${H}px`
      beamOuter.style.height = `${t}px`
      deployedRef.current = t
      // 22px of tip movement between scroll ticks reads as full speed — the designer
      // handoff's own sensitivity constant for the head's velocity input.
      if (lastTForVelRef.current !== null) {
        const delta = Math.abs(t - lastTForVelRef.current)
        velTargetRef.current = Math.max(velTargetRef.current, Math.min(1, delta / 22))
      }
      lastTForVelRef.current = t
      const last = cards[cards.length - 1]
      if (last) {
        installDoneAtRef.current = last.offsetTop + last.offsetHeight / 2 + CONFIG.spurReach
      }

      for (const card of cards) {
        const mid = card.offsetTop + card.offsetHeight / 2
        const q = still ? 1 : clamp((t - mid) / CONFIG.spurReach)
        card.style.setProperty('--b', clamp(q / 0.26).toFixed(4))
        card.style.setProperty('--a', clamp((q - 0.26) / 0.34).toFixed(4))
        card.style.setProperty('--c', clamp((q - 0.58) / 0.42).toFixed(4))
      }
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

    // The animation reads the beam's position purely off `getBoundingClientRect`,
    // which is already viewport-relative regardless of which ancestor actually
    // scrolls — so the only scroll-container-specific thing here is which
    // element's `scroll` event to listen on. `NextWebShell`'s app chrome
    // scrolls an inner `overflow-y-auto` region, not `window`, on every product
    // this route could ship under — walk up for it instead of assuming window.
    let scrollTarget: HTMLElement | Window = window
    for (let el = track.parentElement; el; el = el.parentElement) {
      const style = getComputedStyle(el)
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) {
        scrollTarget = el
        break
      }
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
    const beamOuter = beamOuterRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const padCanvas = padCanvasRef.current
    const padCtx = padCanvas?.getContext('2d')
    if (!track || !beamOuter || !canvas || !ctx) return

    let colors = readThemeColors(canvas)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let time = 0
    // Chases `velTargetRef` (raised by the scroll effect) 20% of the way per frame,
    // which is what turns discrete scroll ticks into a smooth `--v` — the designer
    // handoff's own settle formula, just folded into this file's already-continuous
    // RAF loop instead of the handoff's own self-starting/stopping one, since this
    // loop already runs every frame regardless (for the strand shimmer).
    let vel = 0
    let fabricOpacity = 0

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = track.clientWidth
      const h = track.clientHeight
      if (w > 0 && h > 0 && (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr))) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Cleared unconditionally, same as the main canvas above, so scrolling back to
      // `deployed <= 0` erases the last-drawn crackle instead of leaving it stuck.
      if (padCanvas && padCtx) {
        const pw = padCanvas.clientWidth
        const ph = padCanvas.clientHeight
        if (
          pw > 0 &&
          ph > 0 &&
          (padCanvas.width !== Math.round(pw * dpr) || padCanvas.height !== Math.round(ph * dpr))
        ) {
          padCanvas.width = Math.round(pw * dpr)
          padCanvas.height = Math.round(ph * dpr)
        }
        padCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
        padCtx.clearRect(0, 0, pw, ph)
      }

      vel += (velTargetRef.current - vel) * 0.2
      velTargetRef.current *= 0.85

      const deployed = deployedRef.current
      if (fabricRef.current) {
        fabricOpacity += ((deployed > 8 ? 1 : 0) - fabricOpacity) * 0.05
        fabricRef.current.style.opacity = fabricOpacity.toFixed(3)
      }
      // Set on `track`, not `headRef` — the launchpad's aperture glow is a SIBLING of the
      // head, not a descendant, so it can only pick up `--v` via inheritance from an
      // ancestor the two share. One number, both structures light up together.
      track.style.setProperty('--v', vel.toFixed(4))
      if (headRef.current) {
        // The rocket is always rendered, docked to the launchpad at `deployed === 0` —
        // never faded out — so the harness never reads as headless before the first
        // scroll. Only the atmosphere around it (glow/plume/shock-arcs, below) is a
        // speed-earned effect; those already read as ~0 at rest via `var(--v,0)`.
        headRef.current.style.top = `${deployed}px`
        headRef.current.style.opacity = '1'
      }
      if (deployed > 0) {
        // `offsetLeft` reports the box's pre-transform layout position — it does not
        // account for the `-translate-x-1/2` centering transform on `beamOuter`, so it
        // reads ~10px right of the beam's real painted centerline. `getBoundingClientRect`
        // reflects the actual transformed geometry; subtracting the track's own rect
        // converts it back to the track-local coordinate space the canvas draws in.
        const trackRect = track.getBoundingClientRect()
        const beamRect = beamOuter.getBoundingClientRect()
        const beamX = beamRect.left + beamRect.width / 2 - trackRect.left
        drawCrackle(ctx, colors, beamX, deployed, time)

        if (padCanvas && padCtx) {
          drawPadCrackle(padCtx, colors, padCanvas.clientWidth, padCanvas.clientHeight, time)
        }

        if (atmoRef.current) {
          const bottomFade = Math.min(1, Math.max(0, (installDoneAtRef.current - deployed) / HEAD_HIDE_MARGIN))
          atmoRef.current.style.opacity = bottomFade.toFixed(3)
        }
      }

      if (!reduce) {
        time += 1
        raf = requestAnimationFrame(render)
      }
    }
    raf = requestAnimationFrame(render)

    const themeObserver = new MutationObserver(() => {
      colors = readThemeColors(canvas)
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => {
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
    }
  }, [])

  return (
    // Full-bleed outer, same split home's own full-width sections use (`page.tsx`'s
    // `#next-steps`): the fabric backdrop is absolute against THIS box, so it spans the
    // whole viewport regardless of screen width, while `trackRef` below constrains the
    // beam/cards to a readable column. A single `max-w-5xl` wrapper around both would put
    // the fabric behind the same gutter as the text, which is exactly the "still has x
    // padding" the outer max-w previously produced.
    <div className='relative w-full'>
      {/* The "fabric of the universe" backdrop, mounted FIRST so every later sibling
          (beam, canvas, head, cards) paints over it. Invisible at rest, fades in once
          the rocket starts moving (see `fabricOpacity` in the effect above) rather than
          being visible behind the static intro copy above this track. */}
      <div ref={fabricRef} aria-hidden className='pointer-events-none absolute inset-0 opacity-0 motion-reduce:hidden'>
        <EnergyFieldBg interactive={false} />
      </div>
      {/* `mt`, not `pt` — the beam/head/pad anchors are `position:absolute` with `top-0`,
          which resolves against `trackRef`'s PADDING edge regardless of how much
          padding-top it carries (padding never moves an absolutely positioned descendant's
          containing-block edge — only normal-flow content, i.e. the cards, would shift).
          `pt-32` here previously left the launchpad overlapping the hero text above it,
          since the anchor point never actually moved. `mt` instead shifts `trackRef`'s
          whole box within the outer wrapper's flow, which does move the anchor. */}
      <div ref={trackRef} className='relative mx-auto max-w-5xl mt-40'>
        {/* The launchpad — ported from the designer's own isolated reference file, same
          precedent as the head. STRUCTURE, not animation: drawn fully at rest (no deploy
          fade), because the page would otherwise read as having no origin until scrolled.
          Its only moving part is the aperture glow, driven by the SAME `--v` the head
          reads — set on `track` (a shared ancestor of this and `headRef`) by the canvas
          effect above, so the two stay in sync with zero bookkeeping here. Must come
          BEFORE the beam in source so the beam paints over the deck's aperture gap
          instead of under it. */}
        <div aria-hidden className='pointer-events-none absolute top-0 left-1/2 size-0 max-[52.5rem]:left-[1.125rem]'>
          <div className='absolute top-[-1.375rem] left-[-2.125rem] h-[4.25rem] w-[4.25rem] rounded-full opacity-[calc(0.22+0.78*var(--v,0))] motion-reduce:opacity-[0.22] bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_32%,transparent)_0%,transparent_62%)]' />
          <svg
            viewBox='0 0 200 124'
            className='absolute top-[-7.75rem] left-[-6.25rem] h-[7.75rem] w-[12.5rem] origin-bottom max-[52.5rem]:scale-50'
            fill='none'
          >
            {/* cross-ties between the towers, drawn first so the towers cap them */}
            <path d='M42 26 H158 M42 54 H158 M42 82 H158' stroke='var(--foreground)' strokeWidth='1.6' opacity='0.26' />
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
            {/* scorch: evidence the rocket already went */}
            <path
              d='M82 121 Q100 114 118 121'
              stroke='var(--primary)'
              strokeWidth='2'
              strokeLinecap='round'
              opacity='0.34'
            />
          </svg>
          {/* The cross-ties, energized — see `drawPadCrackle` above. Same box as the SVG
            above (position, size, `origin-bottom` + mobile scale) so its three strands
            trace the static tie lines exactly; drawn as a sibling rather than baked into
            the SVG since it needs its own per-frame canvas repaint. */}
          <canvas
            ref={padCanvasRef}
            aria-hidden
            className='pointer-events-none absolute top-[-7.75rem] left-[-6.25rem] h-[7.75rem] w-[12.5rem] origin-bottom max-[52.5rem]:scale-50'
          />
        </div>
        <div
          ref={beamOuterRef}
          aria-hidden
          className='pointer-events-none absolute top-0 left-1/2 h-0 w-5 -translate-x-1/2 overflow-hidden max-[52.5rem]:left-2 max-[52.5rem]:translate-x-0'
        >
          <div
            ref={beamInnerRef}
            className='absolute top-0 left-0 h-0 w-5 border-x-2 border-foreground bg-[repeating-linear-gradient(to_bottom,var(--foreground)_0_1px,transparent_1px_72px)]'
          />
        </div>
        <canvas ref={canvasRef} aria-hidden className='pointer-events-none absolute inset-0 size-full' />

        {/* The head — ported from the designer's own isolated reference file rather than
          re-derived. A zero-size anchor point riding the beam tip (`top`/`--v` written
          imperatively by the canvas effect above, same "no Tailwind equivalent" carve-out
          RULE 3 already covers); everything visible hangs off it via fixed rem offsets, in
          PAINT order — glow, then plume, then the atmosphere arcs, then the nose LAST so
          it sits on top of its own glow. Only the nose is static; the other three read
          `--v` for opacity/scale, so the "atmosphere" is earned by scroll speed instead of
          looping. Positioned like `beamOuter`: `left-1/2` desktop, the beam's own mobile
          centerline (`1.125rem`, see the junction's comment) below the breakpoint — a
          zero-width box needs no `-translate-x-1/2` correction the way a wide one would. */}
        <div
          ref={headRef}
          aria-hidden
          className='pointer-events-none absolute top-0 left-1/2 size-0 max-[52.5rem]:left-[1.125rem]'
        >
          <div ref={atmoRef}>
            <div className='absolute top-[-2.75rem] left-[-6.5rem] h-[13rem] w-[13rem] rounded-full opacity-[calc(0.16+0.84*var(--v,0))] scale-[calc(0.72+0.44*var(--v,0))] motion-reduce:hidden bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_40%,transparent)_0%,color-mix(in_oklab,var(--primary)_11%,transparent)_38%,transparent_66%)]' />
            <div className='absolute top-[-7rem] left-[-0.5625rem] h-[7rem] w-[1.125rem] opacity-[var(--v,0)] motion-reduce:hidden bg-[linear-gradient(to_top,color-mix(in_oklab,var(--primary)_58%,transparent),transparent)]' />
            <svg
              viewBox='0 0 140 100'
              className='absolute top-[0.125rem] left-[-4.375rem] h-[6.25rem] w-[8.75rem] opacity-[calc(0.2+0.8*var(--v,0))]'
              fill='none'
            >
              <path
                d='M8 32 H30 M132 32 H110 M15 45 H33 M125 45 H107'
                stroke='var(--primary)'
                strokeWidth='2.4'
                strokeLinecap='round'
                opacity='0.55'
              />
              <path
                d='M22 86 Q70 63 118 86'
                stroke='var(--primary)'
                strokeWidth='2.6'
                strokeLinecap='round'
                opacity='0.5'
              />
              <path
                d='M41 95 Q70 81 99 95'
                stroke='var(--primary)'
                strokeWidth='2'
                strokeLinecap='round'
                opacity='0.3'
              />
            </svg>
          </div>
          <svg viewBox='0 0 48 64' className='absolute top-[-0.25rem] left-[-1.5rem] h-[4rem] w-[3rem]' fill='none'>
            <path
              d='M12 10 L3 22 V34 L12 26 Z'
              fill='var(--card)'
              stroke='var(--foreground)'
              strokeWidth='2'
              strokeLinejoin='miter'
            />
            <path
              d='M36 10 L45 22 V34 L36 26 Z'
              fill='var(--card)'
              stroke='var(--foreground)'
              strokeWidth='2'
              strokeLinejoin='miter'
            />
            <path
              d='M12 0 H36 V30 L24 60 L12 30 Z'
              fill='var(--background)'
              stroke='var(--foreground)'
              strokeWidth='2.4'
              strokeLinejoin='miter'
            />
            <path d='M12 9 H36' stroke='var(--foreground)' strokeWidth='1.6' opacity='0.4' />
            <path d='M17 19 H31' stroke='var(--primary)' strokeWidth='3.4' strokeLinecap='round' />
          </svg>
        </div>

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
                // `max-[52.5rem]:left-[1.125rem]` is the beam's own mobile CENTERLINE, not
                // its left edge — the beam is a narrow `w-5` (1.25rem) box at `left-2`
                // (0.5rem), so its center sits at 0.5rem + 1.25rem/2 = 1.125rem. A first
                // pass copied the beam's `left-2` verbatim onto this box, which matched
                // their LEFT EDGES instead of their centers — fine for the beam's own
                // narrow width, but this wrapper is a much wider `size-10` (2.5rem) box, so
                // matching left edges pushed its true center well to the right of the beam.
                // `-translate-x-1/2` stays active at every breakpoint (only the anchor
                // changes) so a wide box centers on a POINT the same way it does on
                // desktop, rather than left-aligning to one.
                className='absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 opacity-[var(--b,0)] scale-[calc(0.74+0.26*var(--b,0))] max-[52.5rem]:left-[1.125rem] motion-reduce:scale-100 motion-reduce:opacity-100'
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
                // (1.125rem, see the junction wrapper above) — the hex's real size doesn't
                // change between breakpoints, only where the beam's centerline sits does.
                className='pointer-events-none absolute top-1/2 left-[calc(50%+0.974375rem)] h-5 -translate-y-1/2 overflow-hidden [--spur-len:2.9375rem] w-[calc(var(--spur-len)*var(--a,0))] max-[52.5rem]:left-[2.099375rem] max-[52.5rem]:[--spur-len:5.3125rem] motion-reduce:w-[var(--spur-len)]'
              >
                <div className='absolute top-0 left-0 h-5 w-[var(--spur-len)] border-y-2 border-foreground bg-[repeating-linear-gradient(to_right,var(--foreground)_0_1px,transparent_1px_26px)]' />
              </div>

              <div
                className={cn(
                  // Fade only, no slide — the panel's own position is fixed by its margin
                  // below; `--c` drives just opacity, never a translate.
                  'opacity-[var(--c,0)] motion-reduce:opacity-100',
                  // Panel margin = spur's own start offset (0.974375rem desktop /
                  // 2.099375rem mobile) + its length (2.9375rem desktop / 5.3125rem
                  // mobile) — derived from the SAME geometry the spur itself uses, not an
                  // approximated constant, so the panel always lands exactly where the
                  // spur ends instead of leaving a gap.
                  'ml-[calc(50%+3.911875rem)] max-[52.5rem]:ml-[7.411875rem]',
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
                    {/* Below the harness breakpoint the mark goes full-width BELOW the
                      title/version row instead of a small icon beside it — the marks are
                      deliberately 4:3 rectangles precisely so they read well at that
                      width, not just as a small icon crop. `order-2` (mobile) puts the
                      mark after the text block despite coming first in markup, matching
                      the desktop reading order (icon, then title) without duplicating
                      either block. */}
                    <Flex align='center' gap={4} className='max-[52.5rem]:flex-col max-[52.5rem]:items-stretch'>
                      <MilestoneVisual version={item.version} image={item.image} />
                      <Flex direction='column' gap={1} className='min-w-0 max-[52.5rem]:order-first'>
                        <CardTitle
                          className={`font-serif text-xl font-normal text-foreground ${
                            item.status === 'dropped' ? 'line-through' : ''
                          }`}
                        >
                          {item.title}
                        </CardTitle>
                        <Flex align='center' gap={2}>
                          <Text as='span' className='font-mono text-xs text-muted-foreground'>
                            v{item.version}
                          </Text>
                          <StatusBadge status={item.status} />
                        </Flex>
                      </Flex>
                    </Flex>
                  </CardHeader>
                  <CardContent className='flex flex-col gap-3'>
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

        <div aria-hidden className='h-[11.25rem]' />
      </div>
    </div>
  )
}
