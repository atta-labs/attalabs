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

// The tip nose cone — a fixed, crisp vector shape, drawn the SAME way every other piece
// of the harness is (`JunctionGlyph`'s `fill=background`/`stroke=foreground` line-art),
// not a soft glowing blob. It never moves or turns — always dead-centered on `beamX` —
// and `boom` (0..1, smoothed from how fast the tip is moving) only changes its length,
// never its position or angle. The silhouette matches the classic rocket-icon shape a
// user pasted for reference: a straight-sided collar (with a double-ring porthole) flush
// with the beam, tapering into a rounded nose — a shallow outward bow on each side
// (`quadraticCurveTo`), not a straight-sided triangle, which read as a sharp pencil tip
// rather than a rocket's rounded cap. It fades out entirely once the tip reaches
// the bottom of the track — once fully installed there's no more leading edge pushing
// forward, so nothing should still be drawn there (a sealed end cap crossfades in
// instead, see `capFade` below).
const FLARE_IDLE = 0.32
const FLARE_UNIT = 5 // px of tip movement per canvas frame that reads as "full boom"
const FLARE_SMOOTHING = 0.18
const NOSE_BASE_HALF = 11 // fixed half-width where the nose meets the beam — fatter, not a thin pencil
const NOSE_COLLAR_LEN = 12 // fixed length of the straight-sided body/porthole section before the taper
const NOSE_HIDE_MARGIN = 50 // px of remaining track over which the nose fades out at the bottom

function drawCrackle(
  ctx: CanvasRenderingContext2D,
  colors: ReturnType<typeof readThemeColors>,
  beamX: number,
  deployed: number,
  installDoneAt: number,
  time: number,
  boom: number
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

  const bottomFade = Math.min(1, Math.max(0, (installDoneAt - deployed) / NOSE_HIDE_MARGIN))

  // A sealed end cap crossfades IN as the nose fades out, so the rail is never simply
  // left open once there's nothing left to install — it closes into a small welded
  // terminator instead of just vanishing. Fades back out the instant the nose has room
  // to travel again (scrolling back up past `installDoneAt`).
  const capFade = 1 - bottomFade
  if (capFade > 0.02) {
    ctx.beginPath()
    ctx.moveTo(beamX - 10, deployed)
    ctx.lineTo(beamX + 10, deployed)
    ctx.strokeStyle = colors.foreground
    ctx.lineWidth = 2
    ctx.globalAlpha = capFade
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(beamX, deployed, 2, 0, Math.PI * 2)
    ctx.fillStyle = colors.primary
    ctx.globalAlpha = capFade
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (bottomFade <= 0) return

  const intensity = Math.min(1, FLARE_IDLE + boom) * bottomFade
  // Only the nose LENGTH reacts to speed — the collar (where it's flush with the beam)
  // and porthole stay fixed size, same discipline as the rest of the shape: nothing
  // about this silhouette moves or resizes except how far the point reaches.
  const noseLen = 16 + Math.min(1, FLARE_IDLE + boom) * 16
  const collarBottom = deployed + NOSE_COLLAR_LEN
  const tipY = collarBottom + noseLen

  // One continuous outline: straight collar sides flush with the beam, then a ROUNDED
  // taper (a shallow outward bow, not a straight line) closing to a point — the
  // reference had a curved, semicircle-ish cap, not a sharp straight-sided triangle;
  // straight sides here read as a thin pencil instead of a rocket nose.
  const bowCtrlX = NOSE_BASE_HALF * 1.2
  const bowCtrlY = collarBottom + noseLen * 0.5
  ctx.beginPath()
  ctx.moveTo(beamX - NOSE_BASE_HALF, deployed)
  ctx.lineTo(beamX - NOSE_BASE_HALF, collarBottom)
  ctx.quadraticCurveTo(beamX - bowCtrlX, bowCtrlY, beamX, tipY)
  ctx.quadraticCurveTo(beamX + bowCtrlX, bowCtrlY, beamX + NOSE_BASE_HALF, collarBottom)
  ctx.lineTo(beamX + NOSE_BASE_HALF, deployed)
  ctx.closePath()
  ctx.fillStyle = colors.background
  ctx.globalAlpha = bottomFade
  ctx.fill()
  ctx.strokeStyle = colors.foreground
  ctx.lineWidth = 2
  ctx.stroke()

  // The porthole — a double-ring circle centered in the collar, the one detail that
  // makes this read as "rocket" rather than a bare triangle.
  const portholeY = deployed + NOSE_COLLAR_LEN * 0.55
  const portholeR = NOSE_BASE_HALF * 0.5
  ctx.beginPath()
  ctx.arc(beamX, portholeY, portholeR, 0, Math.PI * 2)
  ctx.strokeStyle = colors.foreground
  ctx.lineWidth = 1.5
  ctx.globalAlpha = bottomFade
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(beamX, portholeY, portholeR * 0.5, 0, Math.PI * 2)
  ctx.stroke()

  // The tip point — a small bright bead, the "live" contact where the current arcs out.
  ctx.beginPath()
  ctx.arc(beamX, tipY, 2, 0, Math.PI * 2)
  ctx.fillStyle = colors.primary
  ctx.globalAlpha = intensity
  ctx.fill()

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

const STATUS_LABEL: Record<RoadmapMilestone['status'], string> = {
  shipping: 'Shipped',
  planned: 'Planned',
  dropped: 'Dropped'
}

const STATUS_BADGE_CLASS: Record<RoadmapMilestone['status'], string> = {
  shipping: 'text-success border-success/40',
  planned: 'text-primary border-primary/40',
  dropped: 'border-dashed text-muted-foreground line-through'
}

function StatusBadge({ status }: { status: RoadmapMilestone['status'] }) {
  return (
    <Badge variant='outline' className={`shrink-0 font-mono text-xs font-normal ${STATUS_BADGE_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

function MilestoneVisual({ version, image }: { version: string; image: RoadmapMilestone['image'] }) {
  const Mark = MARK_BY_VERSION[version]

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
      ) : image ? (
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
      const floor = first.offsetTop + first.offsetHeight / 2 + CONFIG.spurReach
      const t = still ? H : Math.max(floor, Math.min(H, line - r.top))

      beamInner.style.height = `${H}px`
      beamOuter.style.height = `${t}px`
      deployedRef.current = t
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
    if (!track || !beamOuter || !canvas || !ctx) return

    let colors = readThemeColors(canvas)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let time = 0
    let lastDeployed = deployedRef.current
    let boom = 0

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

      const deployed = deployedRef.current
      if (deployed > 0) {
        // `offsetLeft` reports the box's pre-transform layout position — it does not
        // account for the `-translate-x-1/2` centering transform on `beamOuter`, so it
        // reads ~10px right of the beam's real painted centerline. `getBoundingClientRect`
        // reflects the actual transformed geometry; subtracting the track's own rect
        // converts it back to the track-local coordinate space the canvas draws in.
        const trackRect = track.getBoundingClientRect()
        const beamRect = beamOuter.getBoundingClientRect()
        const beamX = beamRect.left + beamRect.width / 2 - trackRect.left
        const rawBoom = Math.min(1, Math.abs(deployed - lastDeployed) / FLARE_UNIT)
        boom += (rawBoom - boom) * FLARE_SMOOTHING
        lastDeployed = deployed
        drawCrackle(ctx, colors, beamX, deployed, installDoneAtRef.current, time, boom)
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
    <div ref={trackRef} className='relative'>
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
                'opacity-[var(--c,0)] motion-reduce:opacity-100',
                'translate-y-[calc(0.875rem*(1-var(--c,0)))] motion-reduce:translate-y-0',
                // Panel margin = spur's own start offset (0.974375rem desktop /
                // 2.099375rem mobile) + its length (2.9375rem desktop / 5.3125rem
                // mobile) — derived from the SAME geometry the spur itself uses, not an
                // approximated constant, so the panel always lands exactly where the
                // spur ends instead of leaving a gap.
                'ml-[calc(50%+3.911875rem)] translate-x-[calc(-0.75rem*(1-var(--c,0)))] max-[52.5rem]:ml-[7.411875rem] motion-reduce:translate-x-0',
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
  )
}
