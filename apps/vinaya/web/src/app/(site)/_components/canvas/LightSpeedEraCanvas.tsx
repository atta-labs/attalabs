'use client'

import {
  drawBomb,
  drawImpactSpark,
  drawLabel,
  drawMainSphere,
  drawMissile,
  drawRobot,
  getRobotBodyCenter
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
  projectileAlpha
} from './geometry'
import { useCanvasScene } from './useCanvasScene'

// Trimmed to the swarm's actual horizontal span (leftmost robot's body to rightmost
// robot's body in the 6-wide rank) plus a small margin — same "canvas ends where the
// painting ends" principle as LOGICAL_HEIGHT below, now applied to width. Everything
// else (SPHERE, SWARM columns) is defined relative to LOGICAL_WIDTH / 2, so this single
// constant recenters the whole scene automatically.
const LOGICAL_WIDTH = 220
// The canvas ends where the painting ends — LOGICAL_HEIGHT is trimmed to the actual
// content bounds (topmost point across both era canvases to SPHERE's bottom edge, plus
// a few px of stroke-antialiasing margin), not an arbitrary round number. Any visual
// spacing around the canvas belongs to the surrounding flex/gap classes in
// TwoErasSection.tsx, not to dead space baked in here.
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

const SWARM_ROBOT_SCALE = 1.9
const SWARM_COLS = 6
// A robot's body square is 14 * scale * 1.05 wide — the col gap has to clear that, but
// no more, so the row reads as a tight rank, shoulder to shoulder, not a loose scatter.
const SWARM_COL_GAP = 14 * SWARM_ROBOT_SCALE * 1.05 + 4
// A robot spans roughly 33 * scale top-to-toe — the row gap has to clear that, but no
// more, so the two rows stay a dense stack rather than a loose scatter.
const SWARM_ROW_GAP = 33 * SWARM_ROBOT_SCALE + 4
// Shared reference: both era canvases align their crowd's VISUAL CENTER (not top) to
// this same y, so the middle of the robots' two rows lines up with a human's body-middle
// — must stay in sync with NormalEraCanvas's own derivation of this value. This is the
// taller block (2 rows), so it sets the floor both canvases use, shifted down by the same
// trim that cropped LOGICAL_HEIGHT to content.
const ROW_VISUAL_CENTER_Y = 68
// The two-row block spans from the back row's antenna-top (11*scale above its own
// anchor) to the front row's body-bottom (21*scale below its own anchor, one
// SWARM_ROW_GAP further down) — solving for the back row's anchor y that centers that
// whole span exactly on the shared reference.
const SWARM_TOP_Y = ROW_VISUAL_CENTER_Y - (SWARM_ROW_GAP + 10 * SWARM_ROBOT_SCALE) / 2

function robotRow(y: number) {
  return Array.from({ length: SWARM_COLS }, (_, i) => ({
    x: SPHERE.x + i * SWARM_COL_GAP - ((SWARM_COLS - 1) * SWARM_COL_GAP) / 2,
    y
  }))
}

// The FRONT row (closer to the sphere) is the one that fires — there's no other row
// between it and the target, so the projectile never crosses another row on its way
// down. The back row is decoration only and never fires.
const DECOY_ROBOTS: Point[] = robotRow(SWARM_TOP_Y)
const FIRING_ROBOTS = robotRow(SWARM_TOP_Y + SWARM_ROW_GAP)

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
  { kind: 'missile' as const, label: 'force push to main', originIndex: 5 },
  { kind: 'bomb' as const, label: 'YOLO merge #892', originIndex: 2 },
  { kind: 'missile' as const, label: 'deps: 412 changed', originIndex: 3 },
  { kind: 'bomb' as const, label: 'rewrote auth in 3s', originIndex: 1 },
  { kind: 'missile' as const, label: 'deleted .gitignore', originIndex: 4 },
  { kind: 'bomb' as const, label: 'force-pushed prod', originIndex: 0 },
  { kind: 'missile' as const, label: 'merged without review', originIndex: 5 },
  { kind: 'bomb' as const, label: 'regenerated lockfile', originIndex: 2 },
  { kind: 'missile' as const, label: 'skipped all tests', originIndex: 3 }
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

      for (const robot of DECOY_ROBOTS) {
        drawRobot(ctx, robot.x, robot.y, SWARM_ROBOT_SCALE, colors, 0)
      }
      FIRING_ROBOTS.forEach((robot, i) => {
        drawRobot(ctx, robot.x, robot.y, SWARM_ROBOT_SCALE, colors, i === active.originIndex ? hatchOpen : 0)
      })

      const target = edgePointOnCircle(origin, sphereCenter, SPHERE.radius)
      const angle = angleOf(origin, target)
      // Same mirroring principle as the ring: robots left of center curve one way, robots
      // right of center curve the other — a fixed bulge sign would make every robot bow
      // in the same absolute direction regardless of which side it's firing from.
      const curveSign = originRobot.x < SPHERE.x ? 1 : -1
      const pos = curvedLerpPoint(origin, target, flightProgress, FLIGHT_ARC_BULGE * curveSign)

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
      drawLabel(ctx, active.label, pos.x, pos.y - 30, colors.destructive, colors.fontMono)
      ctx.restore()

      drawImpactSpark(ctx, target.x, target.y, impactEnvelope(flightProgress), colors, 'warning', IMPACT_MAGNITUDE)
    }
  })

  return (
    <div aria-hidden='true'>
      <canvas ref={canvasRef} className='mx-auto h-[437px] w-[220px]' />
    </div>
  )
}
