'use client'

import {
  drawBomb,
  drawExplosion,
  drawLabel,
  drawMainSphere,
  drawMissile,
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

// Trimmed to the swarm's actual horizontal span (leftmost robot's body to rightmost
// robot's body in the 6-wide rank) plus a small margin — same "canvas ends where the
// painting ends" principle as LOGICAL_HEIGHT below, now applied to width. Everything
// else (SPHERE, SWARM columns) is defined relative to LOGICAL_WIDTH / 2, so this single
// constant recenters the whole scene automatically.
// Widened past the swarm's own span (60 logical units of pure side margin) so a
// release-moment action label — measured and clamped in `drawLabel`, but only within
// whatever margin actually exists — has room to sit fully on-canvas instead of getting
// cut off near the leftmost/rightmost origin column.
// Matches NormalEraCanvas's own LOGICAL_WIDTH exactly — the two era canvases render at
// the same CSS width now, so their logical width has to match too (same LOGICAL_HEIGHT
// already, so equal LOGICAL_WIDTH means equal aspect ratio, means no letterboxing).
const LOGICAL_WIDTH = 360
// The canvas ends where the painting ends — LOGICAL_HEIGHT is trimmed to the actual
// content bounds (topmost point across both era canvases to SPHERE's bottom edge, plus
// a few px of stroke-antialiasing margin), not an arbitrary round number. Any visual
// spacing around the canvas belongs to the surrounding flex/gap classes in
// HeroSection.tsx, not to dead space baked in here.
// Grown back from the tight 386 fit — the crowd-to-sphere gap that trim left was too
// short for a bomb/missile's action label to clear the crowd before reaching the
// sphere, making labels overlap the row. Only SPHERE moved down (see below); the crowd
// itself (ROW_VISUAL_CENTER_Y) is untouched, so row alignment doesn't shift.
const LOGICAL_HEIGHT = 437
// Same y as NormalEraCanvas's SPHERE, on purpose — the two "main" circles must land at
// the same screen height side by side. This canvas has the taller crowd (2 robot rows),
// so 282 is this sphere's own tightest fit; NormalEraCanvas matches it rather than using
// its own (smaller) tightest fit.
const SPHERE = { x: LOGICAL_WIDTH / 2, y: 331, radius: 100 }
/** Impact wave is deliberately bigger here than the spear's — a missile/bomb hits harder. */
const IMPACT_MAGNITUDE = 1.7
// A slight arc instead of a dead-straight line — origin and target are untouched
// (curvedLerpPoint's offset is 0 at both ends), only the path in between bulges.
const FLIGHT_ARC_BULGE = 22

// Derived from the shared TWO_ERAS_FIGURE_HEIGHT (not a standalone guess) — this is what
// keeps the agents row rendering at the SAME pixel height as the humans row by
// construction. A robot's own unit-height (32) differs from a human's (36), so matching
// pixel heights needs a correspondingly bigger scale, not the same scale number.
const SWARM_ROBOT_SCALE = TWO_ERAS_FIGURE_HEIGHT / ROBOT_FIGURE_HEIGHT_UNITS
const SWARM_COLS = 5
// A robot's body square is 14 * scale * 1.05 wide — the col gap has to clear that, but
// no more, so the row reads as a tight rank, shoulder to shoulder, not a loose scatter.
const SWARM_COL_GAP = 14 * SWARM_ROBOT_SCALE * 1.05 + 4
// Shared reference: both era canvases align their crowd's VISUAL CENTER (not top) to
// this same y, so a robot's body-middle lines up with a human's body-middle — must stay
// in sync with NormalEraCanvas's own derivation of this value.
const ROW_VISUAL_CENTER_Y = 68
// `drawRobot`'s anchor sits near the neck, not the body's visual middle — the body
// (5*scale + 16*scale below anchor) reaches farther down than the antenna (11*scale)
// reaches up, so the visually-centered anchor sits 5*scale ABOVE the shared reference.
const SWARM_ROW_Y = ROW_VISUAL_CENTER_Y - 5 * SWARM_ROBOT_SCALE

function robotRow(y: number) {
  return Array.from({ length: SWARM_COLS }, (_, i) => ({
    x: SPHERE.x + i * SWARM_COL_GAP - ((SWARM_COLS - 1) * SWARM_COL_GAP) / 2,
    y
  }))
}

// One row now — every robot can fire, no decoy row behind it.
const FIRING_ROBOTS: Point[] = robotRow(SWARM_ROW_Y)

/**
 * Exactly ONE projectile is ever on screen at a time — each gets a full slot of the
 * cycle to itself before the next one fires, so labels never overlap and stay legible.
 * Ten distinct actions cycling across the firing column's six positions — the decoy
 * column never fires.
 */
const SLOT_MS = 1500
/** The hatch gets this fraction of the slot to itself before the projectile starts moving. */
const HATCH_LEAD = 0.16
const SEQUENCE = [
  { kind: 'bomb' as const, label: 'split into 9 repos', originIndex: 0 },
  { kind: 'missile' as const, label: 'force push to main', originIndex: 3 },
  { kind: 'bomb' as const, label: 'YOLO merge #892', originIndex: 1 },
  { kind: 'missile' as const, label: 'deps: 412 changed', originIndex: 4 },
  { kind: 'bomb' as const, label: 'rewrote auth in 3s', originIndex: 2 },
  { kind: 'missile' as const, label: 'deleted .gitignore', originIndex: 0 },
  { kind: 'bomb' as const, label: 'force-pushed prod', originIndex: 4 },
  { kind: 'missile' as const, label: 'merged without review', originIndex: 1 },
  { kind: 'bomb' as const, label: 'regenerated lockfile', originIndex: 3 },
  { kind: 'missile' as const, label: 'skipped all tests', originIndex: 2 }
]
const TOTAL_CYCLE_MS = SEQUENCE.length * SLOT_MS

export function LightSpeedEraCanvas() {
  const canvasRef = useCanvasScene({
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
    draw: (ctx, colors, elapsedMs, reducedMotion) => {
      const shakeT = reducedMotion ? 0 : elapsedMs / 90
      const shakeX = reducedMotion ? 0 : Math.sin(shakeT) * 1.8
      const shakeY = reducedMotion ? 0 : Math.cos(shakeT * 1.3) * 1.4
      const sphereCenter = { x: SPHERE.x + shakeX, y: SPHERE.y + shakeY }
      const crackPulse = reducedMotion ? 0.7 : (Math.sin(elapsedMs / 260) + 1) / 2
      const crackTime = reducedMotion ? 0.5 : elapsedMs / 4200

      drawMainSphere(ctx, sphereCenter.x, sphereCenter.y, SPHERE.radius, colors, 'light-speed', crackPulse, crackTime)

      const cyclePos = elapsedMs % TOTAL_CYCLE_MS
      const activeSlot = Math.floor(cyclePos / SLOT_MS)
      const progress = (cyclePos % SLOT_MS) / SLOT_MS
      // Bounds-safe by construction: activeSlot = floor(cyclePos / SLOT_MS) where
      // cyclePos < SEQUENCE.length * SLOT_MS, so activeSlot is always a valid index.
      const active = SEQUENCE[activeSlot]!
      const originRobot = FIRING_ROBOTS[active.originIndex]!
      // Origin is the body square's own center, not the robot's neck-level anchor point —
      // otherwise the projectile visually erupts from above the square instead of inside it.
      const origin = getRobotBodyCenter(originRobot.x, originRobot.y, SWARM_ROBOT_SCALE)
      const hatchOpen = hatchEnvelope(progress)
      // The hatch opens on the raw slot progress; the projectile's OWN progress only
      // starts counting once the hatch has had its lead time — a visible beat where the
      // bay is open and lit before anything flies out of it.
      const flightProgress = clamp01((progress - HATCH_LEAD) / (1 - HATCH_LEAD))

      FIRING_ROBOTS.forEach((robot, i) => {
        drawRobot(ctx, robot.x, robot.y, SWARM_ROBOT_SCALE, colors, i === active.originIndex ? hatchOpen : 0)
      })

      const target = edgePointOnCircle(origin, sphereCenter, SPHERE.radius)
      const angle = angleOf(origin, target)
      // rowCurveSign is the single source of truth for row-layout curve direction —
      // shared with NormalEraCanvas's archers so both crowds bow outward the same way.
      const pos = curvedLerpPoint(
        origin,
        target,
        flightProgress,
        FLIGHT_ARC_BULGE * rowCurveSign(originRobot.x, SPHERE.x)
      )

      ctx.save()
      ctx.globalAlpha = projectileAlpha(flightProgress)
      if (active.kind === 'bomb') {
        drawBomb(ctx, pos.x, pos.y, colors)
      } else {
        drawMissile(ctx, pos.x, pos.y, angle, colors)
      }
      ctx.restore()

      // The label only shows once the projectile has cleared the swarm — reading it at
      // the exact instant it launches, overlapping the robots, is what made this unreadable.
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
    <div aria-hidden='true'>
      <canvas ref={canvasRef} className='mx-auto h-[316px] w-[260px]' />
    </div>
  )
}
