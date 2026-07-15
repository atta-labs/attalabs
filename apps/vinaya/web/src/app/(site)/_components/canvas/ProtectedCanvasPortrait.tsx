'use client'

import { Check } from 'lucide-react'
import { Text } from '@atta/ui/shared'
import {
  drawBomb,
  drawExplosion,
  drawLabel,
  drawMainSphere,
  drawMissile,
  drawOrbitRing,
  drawRobot,
  getRobotBodyCenter,
  LABEL_FONT_SIZE,
  ROBOT_FIGURE_HEIGHT_UNITS,
  TWO_ERAS_FIGURE_HEIGHT
} from './primitives'
import {
  angleOf,
  clamp01,
  curvedLerpPoint,
  edgePointOnCircle,
  hatchEnvelope,
  impactEnvelope,
  labelRevealAlpha,
  type Point,
  projectileAlpha,
  rowCurveSign
} from './geometry'
import { useCanvasScene } from './useCanvasScene'

// Portrait variant of ProtectedCanvas — same ring/sphere protection mechanic, but the
// actor layout is the AGENTS CODING era's (a single row above, firing straight down),
// not the landscape variant's two side clusters. There is no human cluster at all here;
// this is deliberately agents-only.
//
// Ring diameter (2 * RING_RADIUS = 310) drives the width, not the actor row (which is
// much narrower) — same "canvas ends where the painting ends" principle every other
// scene here uses, just width-constrained by a different element in this layout.
const LOGICAL_WIDTH = 380
const CENTER: Point = { x: LOGICAL_WIDTH / 2, y: 320 }
// Same absolute ring/sphere radii as the landscape variant — the ring is the shared
// "protection" visual between both variants, not something that shrinks per-layout.
const RING_RADIUS = 155
const SPHERE_RADIUS = 95
// Content-driven: CENTER.y (320) + RING_RADIUS (155) + a bottom margin for the
// "checks 12/12" label sitting just inside the ring's own 6-o'clock point.
const LOGICAL_HEIGHT = 500

const IMPACT_MAGNITUDE = 1.7
const FLIGHT_ARC_BULGE = 22

// Derived from the shared TWO_ERAS_FIGURE_HEIGHT, same as LightSpeedEraCanvas's own
// robot row — this row reads as "the same agents" as the era canvas, not a re-scaled copy.
const SWARM_ROBOT_SCALE = TWO_ERAS_FIGURE_HEIGHT / ROBOT_FIGURE_HEIGHT_UNITS
const SWARM_COLS = 5
const SWARM_COL_GAP = 14 * SWARM_ROBOT_SCALE * 1.05 + 4
// Top margin for the row's own visual center (antenna reaches ~11*scale above this,
// body reaches ~21*scale below it — see LightSpeedEraCanvas for the full derivation).
const ROW_VISUAL_CENTER_Y = 55
const SWARM_ROW_Y = ROW_VISUAL_CENTER_Y - 5 * SWARM_ROBOT_SCALE

function robotRow(y: number): Point[] {
  return Array.from({ length: SWARM_COLS }, (_, i) => ({
    x: CENTER.x + i * SWARM_COL_GAP - ((SWARM_COLS - 1) * SWARM_COL_GAP) / 2,
    y
  }))
}

// One row, every robot can fire — same convention LightSpeedEraCanvas uses.
const FIRING_ROBOTS: Point[] = robotRow(SWARM_ROW_Y)

/** One robot fires at a time — same sequencer pattern as LightSpeedEraCanvas, targeting
 * the RING edge (not the inner sphere) — same "never touches main" convention the
 * landscape variant's actors use. */
const SLOT_MS = 1500
const HATCH_LEAD = 0.16
const SEQUENCE = [
  { kind: 'bomb' as const, label: 'force push to main', originIndex: 0 },
  { kind: 'missile' as const, label: 'skip code review', originIndex: 3 },
  { kind: 'bomb' as const, label: 'auto-merge pr', originIndex: 1 },
  { kind: 'missile' as const, label: 'deploy on friday', originIndex: 4 },
  { kind: 'bomb' as const, label: 'YOLO merge #892', originIndex: 2 },
  { kind: 'missile' as const, label: 'deps: 412 changed', originIndex: 0 },
  { kind: 'bomb' as const, label: 'force-pushed prod', originIndex: 4 },
  { kind: 'missile' as const, label: 'merged without review', originIndex: 1 },
  { kind: 'bomb' as const, label: 'regenerated lockfile', originIndex: 3 },
  { kind: 'missile' as const, label: 'skipped all tests', originIndex: 2 }
]
const TOTAL_CYCLE_MS = SEQUENCE.length * SLOT_MS

export function ProtectedCanvasPortrait() {
  const canvasRef = useCanvasScene({
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
    draw: (ctx, colors, elapsedMs, reducedMotion) => {
      const dashOffset = reducedMotion ? 0 : -((elapsedMs / 40) % 1000)
      drawOrbitRing(ctx, CENTER.x, CENTER.y, RING_RADIUS, dashOffset, colors)
      drawMainSphere(ctx, CENTER.x, CENTER.y, SPHERE_RADIUS, colors, 'protected', 0)

      const cyclePos = elapsedMs % TOTAL_CYCLE_MS
      const activeSlot = Math.floor(cyclePos / SLOT_MS)
      const progress = (cyclePos % SLOT_MS) / SLOT_MS
      const active = SEQUENCE[activeSlot]!
      const originRobot = FIRING_ROBOTS[active.originIndex]!
      const origin = getRobotBodyCenter(originRobot.x, originRobot.y, SWARM_ROBOT_SCALE)
      const hatchOpen = hatchEnvelope(progress)
      const flightProgress = clamp01((progress - HATCH_LEAD) / (1 - HATCH_LEAD))

      FIRING_ROBOTS.forEach((robot, i) => {
        drawRobot(ctx, robot.x, robot.y, SWARM_ROBOT_SCALE, colors, i === active.originIndex ? hatchOpen : 0)
      })

      // Ring edge, not sphere edge — the projectile lands ON the ring, never touching
      // main, same "protection" convention the landscape variant's actors use.
      const target = edgePointOnCircle(origin, CENTER, RING_RADIUS)
      const angle = angleOf(origin, target)
      const pos = curvedLerpPoint(
        origin,
        target,
        flightProgress,
        FLIGHT_ARC_BULGE * rowCurveSign(originRobot.x, CENTER.x)
      )

      ctx.save()
      ctx.globalAlpha = projectileAlpha(flightProgress)
      if (active.kind === 'bomb') {
        drawBomb(ctx, pos.x, pos.y, colors)
      } else {
        drawMissile(ctx, pos.x, pos.y, angle, colors)
      }
      ctx.restore()

      ctx.save()
      ctx.globalAlpha = labelRevealAlpha(flightProgress)
      drawLabel(
        ctx,
        active.label,
        pos.x,
        pos.y - 30,
        colors.destructive,
        colors.fontMono,
        LABEL_FONT_SIZE,
        LOGICAL_WIDTH
      )
      ctx.restore()

      drawExplosion(ctx, target.x, target.y, impactEnvelope(flightProgress), colors, IMPACT_MAGNITUDE)
    }
  })

  return (
    // 240px CSS width — matches the era canvases' own rendered height (316px, at their
    // 260×316 CSS box), not the 420px this used to render at. At 420px this read as
    // disproportionately large next to HUMANS/AGENTS CODING's compact canvases, and its
    // much taller aspect ratio (380/500 vs the era canvases' near-square footprint) made
    // the point list beside it center against a much taller box, landing far from the
    // ring instead of level with it the way HeroSection's own canvas+list pairing does.
    <div className='relative mx-auto aspect-[380/500] w-[340px] max-w-full'>
      <div aria-hidden='true' className='absolute inset-0'>
        <canvas ref={canvasRef} className='h-full w-full' />
      </div>

      {/* Same "vinaya" / "checks 12/12" band labels as the landscape variant, at the
          ring's own 12 and 6 o'clock points — recomputed as fractions of THIS variant's
          own LOGICAL_HEIGHT/CENTER, since the aspect ratio differs. Sized down from the
          landscape variant's text-lg/h-3.5 — those were tuned for a 780px-wide canvas;
          at this canvas's much smaller footprint the same absolute sizes read oversized. */}
      <div className='absolute top-[33%] left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Text as='span' weight='bold' className='font-mono text-sm text-foreground'>
          vinaya
        </Text>
      </div>

      <div className='absolute top-[95%] left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <div className='inline-flex items-center gap-1'>
          <Check className='h-3 w-3 text-success' />
          <Text as='span' size='xs' weight='bold' className='font-mono text-success'>
            checks 12/12
          </Text>
        </div>
      </div>
    </div>
  )
}
