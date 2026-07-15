'use client'

import {
  drawArrow,
  drawBackpack,
  drawBow,
  drawHuman,
  drawImpactSpark,
  drawLabel,
  drawMainSphere,
  getBackpackMouth,
  getHandPosition,
  getHumanThrowPoint,
  HUMAN_FIGURE_HEIGHT_UNITS,
  LABEL_FONT_SIZE,
  SPEAR_APPEAR_END,
  SPEAR_GRAB_END,
  SPEAR_RELEASE_AT,
  throwArmPose,
  TWO_ERAS_FIGURE_HEIGHT
} from './primitives'
import {
  angleOf,
  clamp01,
  curvedLerpPoint,
  edgePointOnCircle,
  impactEnvelope,
  labelRevealAlpha,
  lerpPoint,
  type Point,
  projectileAlpha,
  rowCurveSign
} from './geometry'
import { useCanvasScene } from './useCanvasScene'

// Trimmed to the crowd's actual horizontal span (leftmost archer's backpack to
// rightmost archer's backpack, both at their outward-reaching idle extent) plus a small
// margin — same "canvas ends where the painting ends" principle as LOGICAL_HEIGHT below,
// now applied to width. Everything else (HUMAN_ANCHOR, SPHERE) is defined relative to
// LOGICAL_WIDTH / 2, so this single constant recenters the whole scene automatically.
// Widened past the crowd's own span (60 logical units of pure side margin) so a
// release-moment action label — measured and clamped in `drawLabel`, but only within
// whatever margin actually exists — has room to sit fully on-canvas instead of getting
// cut off near the leftmost/rightmost archer.
const LOGICAL_WIDTH = 360
// The canvas ends where the painting ends — LOGICAL_HEIGHT is trimmed to the actual
// content bounds (topmost point across both era canvases to SPHERE's bottom edge, plus
// a few px of stroke-antialiasing margin), not an arbitrary round number. Any visual
// spacing around the canvas belongs to the surrounding flex/gap classes in
// HeroSection.tsx, not to dead space baked in here.
// Grown back from the tight 386 fit — the crowd-to-sphere gap that trim left was too
// short for a thrown spear's action label to clear the crowd before reaching the
// sphere, making labels overlap the row. Only SPHERE moved down (see below); the crowd
// itself (ROW_VISUAL_CENTER_Y) is untouched, so row alignment doesn't shift.
const LOGICAL_HEIGHT = 437
// Same y as LightSpeedEraCanvas's SPHERE, on purpose — the two "main" circles must land
// at the same screen height side by side. That canvas has a taller crowd (2 robot rows,
// not 1 human row), so the gap above this sphere is a bit more generous than it needs to
// be on its own; the alternative (each sphere at its own tightest y) is what broke this.
const SPHERE = { x: LOGICAL_WIDTH / 2, y: 331, radius: 100 }
const SPEAR_LENGTH = 62
// A slight arc instead of a dead-straight line — origin and target are untouched
// (curvedLerpPoint's offset is 0 at both ends), only the path in between bulges.
const THROW_ARC_BULGE = 22

// All six are archers now — the ground-planted spear was dropped in favor of a single
// consistent mechanic (a backpack/quiver), which reads more naturally at this scale.
// Derived from the shared TWO_ERAS_FIGURE_HEIGHT (not a standalone guess) — this is what
// keeps the humans row rendering at the SAME pixel height as the agents row by
// construction, instead of two independently-tuned scale numbers drifting apart.
const HUMAN_SCALE = TWO_ERAS_FIGURE_HEIGHT / HUMAN_FIGURE_HEIGHT_UNITS
const HUMAN_GRID_COLS = 4
// Shared reference: both era canvases align their crowd's VISUAL CENTER (not top) to
// this same y, so a human's body-middle lines up with the middle of the robots' two
// rows — must stay in sync with LightSpeedEraCanvas's own derivation of this value.
// Set as low as the taller robot block allows (see that file), then shifted down by the
// same trim that cropped LOGICAL_HEIGHT to content — a normal top margin, not the dead
// space a round-number canvas height left above a single row of humans.
const ROW_VISUAL_CENTER_Y = 68
// A human's visual center sits 8*scale ABOVE its anchor (the head reaches 26*scale up
// from the anchor, the legs only 10*scale down — see drawHuman), so the anchor has to
// sit 8*scale BELOW the shared reference for the visual center to land exactly on it.
// HUMAN_NUDGE_Y is a small manual push further down from that exact body-center-of-the-
// whole-two-row-block point — mathematically centered isn't the same as looking level
// with the robots' own top row, and the row read as too high without it.
const HUMAN_NUDGE_Y = 8
const HUMAN_ANCHOR: Point = { x: SPHERE.x, y: ROW_VISUAL_CENTER_Y + 8 * HUMAN_SCALE + HUMAN_NUDGE_Y }
const HUMAN_COL_GAP = 72
const IDLE_POSE = { angle: 1.0, bend: 0.5 }

const HUMAN_POSITIONS = Array.from({ length: HUMAN_GRID_COLS }, (_, i) => ({
  x: HUMAN_ANCHOR.x + i * HUMAN_COL_GAP - ((HUMAN_GRID_COLS - 1) * HUMAN_COL_GAP) / 2,
  y: HUMAN_ANCHOR.y
}))

/**
 * The row mirrors left/right of center: each archer's backpack sits on their OUTWARD
 * side (away from the row's center), never all facing the same way.
 */
function sideOf(i: number): 1 | -1 {
  return HUMAN_POSITIONS[i]!.x < HUMAN_ANCHOR.x ? -1 : 1
}

/**
 * Exactly ONE human throws at a time — each gets a full slot before the next one's
 * turn, cycling through ten distinct actions across all six positions. Firing every
 * position "in parallel" with reused text is what read as a bug before.
 */
const SLOT_MS = 1700
const HUMAN_LABELS = [
  'quick typo fix',
  'add TODO comment',
  'rename a variable',
  'skip the changelog',
  'friday deploy',
  'one-line hotfix',
  'forgot to test',
  'copy-paste fix',
  'quick config tweak',
  'rushed comment update'
]
const THROW_ORDER = [0, 2, 1, 3, 0, 2, 1, 3, 0, 2]
const SEQUENCE = THROW_ORDER.map((positionIndex, i) => ({
  positionIndex,
  label: HUMAN_LABELS[i]!
}))
const TOTAL_CYCLE_MS = SEQUENCE.length * SLOT_MS

export function NormalEraCanvas() {
  const canvasRef = useCanvasScene({
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
    draw: (ctx, colors, elapsedMs) => {
      drawMainSphere(ctx, SPHERE.x, SPHERE.y, SPHERE.radius, colors, 'normal', 0)

      const cyclePos = elapsedMs % TOTAL_CYCLE_MS
      const activeSlot = Math.floor(cyclePos / SLOT_MS)
      const progress = (cyclePos % SLOT_MS) / SLOT_MS
      // Bounds-safe by construction, same as LightSpeedEraCanvas's sequencer.
      const active = SEQUENCE[activeSlot]!

      HUMAN_POSITIONS.forEach((pos, i) => {
        const side = sideOf(i)
        const isActive = i === active.positionIndex
        // Every archer's bow arm points at the sphere at all times, active or not — a
        // real archer holds the bow arm steady toward the target, not just mid-shot.
        const bowAngle = angleOf(pos, SPHERE)

        drawBackpack(ctx, pos.x, pos.y, HUMAN_SCALE, colors, side)

        if (!isActive) {
          drawHuman(ctx, pos.x, pos.y, HUMAN_SCALE, colors, IDLE_POSE)
          drawBow(ctx, pos.x, pos.y, HUMAN_SCALE, colors, bowAngle)
          return
        }

        // First-pass angle from the figure's body toward the sphere, refined once the
        // exact hand-release point is known — the arm is short relative to the flight
        // distance so one refinement pass is all real precision needs here.
        const origin = getHumanThrowPoint(pos.x, pos.y, HUMAN_SCALE, bowAngle)
        const target = edgePointOnCircle(origin, SPHERE, SPHERE.radius)
        const throwAngle = angleOf(origin, target)
        const pose = throwArmPose(throwAngle, progress)
        const drawHandPos = getHandPosition(pos.x, pos.y, HUMAN_SCALE, pose)

        drawHuman(ctx, pos.x, pos.y, HUMAN_SCALE, colors, pose)
        // Passing the live draw-hand position is what makes the string visibly pull
        // back with the arm instead of the bow just floating there with no string.
        drawBow(ctx, pos.x, pos.y, HUMAN_SCALE, colors, bowAngle, drawHandPos)

        // Choreography: appears resting in the quiver, gets grabbed (tracks the hand
        // through windup), then leaves the hand at release for ballistic flight — never
        // just materializes mid-throw.
        const restPoint = getBackpackMouth(pos.x, pos.y, HUMAN_SCALE, side)
        const restHead = { x: restPoint.x, y: restPoint.y - 6.25 }
        const restTail = { x: restPoint.x, y: restPoint.y + 2 }

        let headPos: Point
        let tailPos: Point
        let objectAlpha: number
        let labelAlpha: number

        if (progress < SPEAR_APPEAR_END) {
          objectAlpha = clamp01(progress / SPEAR_APPEAR_END)
          labelAlpha = 0
          headPos = restHead
          tailPos = restTail
        } else if (progress < SPEAR_RELEASE_AT) {
          objectAlpha = 1
          labelAlpha = 0
          const grabT = clamp01((progress - SPEAR_APPEAR_END) / (SPEAR_GRAB_END - SPEAR_APPEAR_END))
          headPos = lerpPoint(restHead, drawHandPos, grabT)
          tailPos = {
            x: headPos.x - Math.cos(pose.angle) * SPEAR_LENGTH,
            y: headPos.y - Math.sin(pose.angle) * SPEAR_LENGTH
          }
        } else {
          const flightT = clamp01((progress - SPEAR_RELEASE_AT) / (1 - SPEAR_RELEASE_AT))
          objectAlpha = projectileAlpha(flightT)
          labelAlpha = labelRevealAlpha(flightT)
          // rowCurveSign is the single source of truth for row-layout curve direction
          // (shared with LightSpeedEraCanvas's robots) — NOT `side`, which encodes the
          // unrelated backpack-facing convention and happens to carry the opposite sign.
          headPos = curvedLerpPoint(origin, target, flightT, THROW_ARC_BULGE * rowCurveSign(pos.x, SPHERE.x))
          tailPos = {
            x: headPos.x - Math.cos(throwAngle) * SPEAR_LENGTH,
            y: headPos.y - Math.sin(throwAngle) * SPEAR_LENGTH
          }
        }

        ctx.save()
        ctx.globalAlpha = objectAlpha
        drawArrow(ctx, tailPos.x, tailPos.y, headPos.x, headPos.y, colors)
        ctx.restore()

        ctx.save()
        ctx.globalAlpha = labelAlpha
        drawLabel(
          ctx,
          active.label,
          headPos.x,
          headPos.y - 20,
          colors.warning,
          colors.fontMono,
          LABEL_FONT_SIZE,
          LOGICAL_WIDTH
        )
        ctx.restore()

        const flightT = clamp01((progress - SPEAR_RELEASE_AT) / (1 - SPEAR_RELEASE_AT))
        drawImpactSpark(ctx, target.x, target.y, impactEnvelope(flightT), colors, 'warning')
      })
    }
  })

  return (
    <div aria-hidden='true'>
      <canvas ref={canvasRef} className='mx-auto h-[316px] w-[260px]' />
    </div>
  )
}
