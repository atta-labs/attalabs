'use client'

import { Check } from 'lucide-react'
import { Text } from '@atta/ui/shared'
import {
  drawArrow,
  drawBackpack,
  drawBomb,
  drawBow,
  drawExplosion,
  drawHuman,
  drawImpactSpark,
  drawLabel,
  drawMainSphere,
  drawMissile,
  drawOrbitRing,
  drawRobot,
  getBackpackMouth,
  getHandPosition,
  getHumanThrowPoint,
  getRobotBodyCenter,
  LABEL_FONT_SIZE,
  SPEAR_APPEAR_END,
  SPEAR_GRAB_END,
  SPEAR_RELEASE_AT,
  throwArmPose
} from './primitives'
import {
  angleOf,
  clamp01,
  colCurveSign,
  curvedLerpPoint,
  edgePointOnCircle,
  hatchEnvelope,
  impactEnvelope,
  labelRevealAlpha,
  lerpPoint,
  type Point,
  projectileAlpha
} from './geometry'
import { useCanvasScene } from './useCanvasScene'

// Same figure scales as the two era canvases, so the crowd here reads as "the same
// size" rather than a shrunken cameo. The rendered box's WIDTH is capped at
// max-w-[520px] regardless of this constant, so growing LOGICAL_WIDTH alone barely buys
// any real screen-space gap (it just shrinks the render scale) — the actual gap lever is
// RING_RADIUS and each cluster's inset below, both tuned directly in screen terms.
const LOGICAL_WIDTH = 660
// The content (ring + both clusters) is wide but not tall — it only spans about 363
// logical units vertically. LOGICAL_HEIGHT used to just equal LOGICAL_WIDTH (a forced
// square), which left ~150 logical units of genuinely empty canvas above and below the
// content — not a letterbox effect, just unused drawing area, because the JSX container
// below was also forced `aspect-square`. Both are now sized to the content's real
// (wide, short) shape instead.
const LOGICAL_HEIGHT = 400
const CENTER: Point = { x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2 }
// Pulled back down from 192 — that gave the sphere a big orbit gap but ate almost all
// of the actor-to-ring gap in the process (ring outer edge grows faster than its inner
// edge as radius grows, for a fixed band ratio). 155 keeps a real, positive sphere gap
// while giving the actors a much bigger one — the actor gap is the current priority.
const RING_RADIUS = 155
const SPHERE_RADIUS = 95
const SPEAR_LENGTH = 62
// A slight arc instead of a dead-straight line — origin and target are untouched
// (curvedLerpPoint's offset is 0 at both ends), only the path in between bulges.
const FLIGHT_ARC_BULGE = 22
// Shrunk from 2.8 — at full era-canvas size the archers read as too tall next to this
// ring's own proportions.
const HUMAN_SCALE = 2.4
const ROBOT_SCALE = 2.2

// Both clusters sit OUTSIDE the ring with real breathing room to the ring edge —
// spears/missiles cross the gap and land ON the ring, never on the inner sphere. Same
// actors, same mechanics as the two era canvases: humans are a backpack/quiver column
// (NormalEraCanvas's mechanism), robots are a hatch-bay column (LightSpeedEraCanvas's
// mechanism) — just reoriented sideways (throwing/firing toward the ring at their own
// height) instead of downward toward a sphere below.
const HUMAN_COUNT = 3
const ROBOT_COUNT = 8
const ROBOT_SUBCOLS = 2
const ROBOT_ROWS = ROBOT_COUNT / ROBOT_SUBCOLS

// Same "+8/+4 breathing room over the figure's own extent" convention the era canvases use.
const HUMAN_ROW_GAP = 36 * HUMAN_SCALE + 8
const ROBOT_ROW_GAP = 33 * ROBOT_SCALE + 4
const ROBOT_SUBCOL_GAP = 42

// Humans face the ring (rightward) — their backpack sits on the OUTWARD side, away from
// the ring, same "outward" convention as NormalEraCanvas's `sideOf`, just constant here
// since every human in this column faces the same way (there's no mirrored left/right
// pairing like the horizontal row has).
const HUMAN_FACING = -1
// Same resting pose NormalEraCanvas uses for idle archers — fixed, not geometry-derived,
// purely a "standing at ease" look.
const IDLE_POSE = { angle: 1.0, bend: 0.5 }

// `drawHuman`'s anchor sits near the neck, not the figure's visual middle — the head
// (26 * scale above anchor) reaches much farther up than the legs (10 * scale below) do
// down, so the visually-centered anchor is 8 * scale BELOW where a naive anchor=CENTER.y
// would put it. Shifting the cluster down by that amount is what makes the middle
// human's actual visual center land exactly on the ring's center, not just its anchor.
// Inset from the edge is small — humans are a slim single column, so they can sit close
// to the edge and still leave real clearance to the ring.
const HUMAN_CLUSTER: Point = { x: 38, y: CENTER.y + 8 * HUMAN_SCALE }
const HUMAN_POSITIONS: Point[] = Array.from({ length: HUMAN_COUNT }, (_, i) => ({
  x: HUMAN_CLUSTER.x,
  y: HUMAN_CLUSTER.y + (i - (HUMAN_COUNT - 1) / 2) * HUMAN_ROW_GAP
}))

// Same correction as the human cluster, mirrored: `drawRobot`'s anchor sits near the
// neck too, but the body (5 * scale + 16 * scale below anchor) reaches farther down than
// the antenna (11 * scale) reaches up, so the visually-centered anchor is 5 * scale ABOVE
// a naive anchor=CENTER.y.
// Inset is bigger than the human cluster's — the two sub-columns make this cluster
// wider, so it needs more clearance from the edge to avoid the rightmost robots
// clipping off the canvas.
const ROBOT_CLUSTER: Point = { x: LOGICAL_WIDTH - 48, y: CENTER.y - 5 * ROBOT_SCALE }
function robotSubcolumn(x: number): Point[] {
  return Array.from({ length: ROBOT_ROWS }, (_, i) => ({
    x,
    y: ROBOT_CLUSTER.y + (i - (ROBOT_ROWS - 1) / 2) * ROBOT_ROW_GAP
  }))
}
// The LEFT sub-column (closer to the ring) is the one that fires — same "closer column
// fires, no other column is between it and the target" rule LightSpeedEraCanvas uses.
const FIRING_ROBOTS = robotSubcolumn(ROBOT_CLUSTER.x - ROBOT_SUBCOL_GAP / 2)
const DECOY_ROBOTS: Point[] = robotSubcolumn(ROBOT_CLUSTER.x + ROBOT_SUBCOL_GAP / 2)

/** One human throws at a time, cycling through all 3 positions — same sequencer pattern as NormalEraCanvas. */
const HUMAN_SLOT_MS = 1700
const HUMAN_LABELS = ['typo fix', 'safe refactor', 'doc update', 'small patch', 'clean commit', 'minor tweak']
const HUMAN_THROW_ORDER = [0, 2, 1, 0, 2, 1]
const HUMAN_SEQUENCE = HUMAN_THROW_ORDER.map((positionIndex, i) => ({
  positionIndex,
  label: HUMAN_LABELS[i]!
}))
const HUMAN_TOTAL_CYCLE_MS = HUMAN_SEQUENCE.length * HUMAN_SLOT_MS

/** One robot fires at a time from the firing column — same sequencer pattern as LightSpeedEraCanvas. */
const ROBOT_SLOT_MS = 1500
const ROBOT_HATCH_LEAD = 0.16
const ROBOT_SEQUENCE = [
  { kind: 'bomb' as const, label: 'force push to main', originIndex: 0 },
  { kind: 'missile' as const, label: 'skip code review', originIndex: 2 },
  { kind: 'bomb' as const, label: 'auto-merge pr', originIndex: 1 },
  { kind: 'missile' as const, label: 'deploy on friday', originIndex: 3 },
  { kind: 'bomb' as const, label: 'force push to main', originIndex: 2 },
  { kind: 'missile' as const, label: 'skip code review', originIndex: 0 }
]
const ROBOT_TOTAL_CYCLE_MS = ROBOT_SEQUENCE.length * ROBOT_SLOT_MS

export function ProtectedCanvas() {
  const canvasRef = useCanvasScene({
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
    draw: (ctx, colors, elapsedMs, reducedMotion) => {
      const dashOffset = reducedMotion ? 0 : -((elapsedMs / 40) % 1000)
      drawOrbitRing(ctx, CENTER.x, CENTER.y, RING_RADIUS, dashOffset, colors)
      drawMainSphere(ctx, CENTER.x, CENTER.y, SPHERE_RADIUS, colors, 'protected', 0)

      // --- Humans: backpack/quiver column, one throws at a time ---
      const humanCyclePos = elapsedMs % HUMAN_TOTAL_CYCLE_MS
      const humanActiveSlot = Math.floor(humanCyclePos / HUMAN_SLOT_MS)
      const humanProgress = (humanCyclePos % HUMAN_SLOT_MS) / HUMAN_SLOT_MS
      const activeHuman = HUMAN_SEQUENCE[humanActiveSlot]!

      HUMAN_POSITIONS.forEach((pos, i) => {
        const isActive = i === activeHuman.positionIndex
        // Every archer's bow arm points at the ring at all times, active or not — a
        // real archer holds the bow arm steady toward the target, not just mid-shot.
        const bowAngle = angleOf(pos, CENTER)
        drawBackpack(ctx, pos.x, pos.y, HUMAN_SCALE, colors, HUMAN_FACING)

        if (!isActive) {
          drawHuman(ctx, pos.x, pos.y, HUMAN_SCALE, colors, IDLE_POSE)
          drawBow(ctx, pos.x, pos.y, HUMAN_SCALE, colors, bowAngle)
          return
        }

        const origin = getHumanThrowPoint(pos.x, pos.y, HUMAN_SCALE, bowAngle)
        const target = edgePointOnCircle(origin, CENTER, RING_RADIUS)
        const throwAngle = angleOf(origin, target)
        const pose = throwArmPose(throwAngle, humanProgress)
        const drawHandPos = getHandPosition(pos.x, pos.y, HUMAN_SCALE, pose)

        drawHuman(ctx, pos.x, pos.y, HUMAN_SCALE, colors, pose)
        // Passing the live draw-hand position is what makes the string visibly pull
        // back with the arm instead of the bow just floating there with no string.
        drawBow(ctx, pos.x, pos.y, HUMAN_SCALE, colors, bowAngle, drawHandPos)

        const restPoint = getBackpackMouth(pos.x, pos.y, HUMAN_SCALE, HUMAN_FACING)
        const restHead = { x: restPoint.x, y: restPoint.y - 6.25 }
        const restTail = { x: restPoint.x, y: restPoint.y + 2 }

        let headPos: Point
        let tailPos: Point
        let objectAlpha: number
        let labelAlpha: number

        if (humanProgress < SPEAR_APPEAR_END) {
          objectAlpha = clamp01(humanProgress / SPEAR_APPEAR_END)
          labelAlpha = 0
          headPos = restHead
          tailPos = restTail
        } else if (humanProgress < SPEAR_RELEASE_AT) {
          objectAlpha = 1
          labelAlpha = 0
          const grabT = clamp01((humanProgress - SPEAR_APPEAR_END) / (SPEAR_GRAB_END - SPEAR_APPEAR_END))
          headPos = lerpPoint(restHead, drawHandPos, grabT)
          tailPos = {
            x: headPos.x - Math.cos(pose.angle) * SPEAR_LENGTH,
            y: headPos.y - Math.sin(pose.angle) * SPEAR_LENGTH
          }
        } else {
          const flightT = clamp01((humanProgress - SPEAR_RELEASE_AT) / (1 - SPEAR_RELEASE_AT))
          objectAlpha = projectileAlpha(flightT)
          labelAlpha = labelRevealAlpha(flightT)
          // colCurveSign is the single source of truth for column-layout curve direction
          // — actors in the first (top) half of the column curve one way, the second
          // (bottom) half the other, so the whole column bows outward symmetrically.
          headPos = curvedLerpPoint(origin, target, flightT, FLIGHT_ARC_BULGE * colCurveSign(pos.y, CENTER.y))
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
          activeHuman.label,
          headPos.x,
          headPos.y - 20,
          colors.success,
          colors.fontMono,
          LABEL_FONT_SIZE,
          LOGICAL_WIDTH
        )
        ctx.restore()

        const flightT = clamp01((humanProgress - SPEAR_RELEASE_AT) / (1 - SPEAR_RELEASE_AT))
        drawImpactSpark(ctx, target.x, target.y, impactEnvelope(flightT), colors, 'success')
      })

      // --- Robots: hatch-bay column, one fires at a time from the firing (near) column ---
      const robotCyclePos = elapsedMs % ROBOT_TOTAL_CYCLE_MS
      const robotActiveSlot = Math.floor(robotCyclePos / ROBOT_SLOT_MS)
      const robotProgress = (robotCyclePos % ROBOT_SLOT_MS) / ROBOT_SLOT_MS
      const activeRobot = ROBOT_SEQUENCE[robotActiveSlot]!
      const originRobot = FIRING_ROBOTS[activeRobot.originIndex]!
      const robotOrigin = getRobotBodyCenter(originRobot.x, originRobot.y, ROBOT_SCALE)
      const hatchOpen = hatchEnvelope(robotProgress)
      const robotFlightProgress = clamp01((robotProgress - ROBOT_HATCH_LEAD) / (1 - ROBOT_HATCH_LEAD))

      for (const robot of DECOY_ROBOTS) {
        drawRobot(ctx, robot.x, robot.y, ROBOT_SCALE, colors, 0)
      }
      FIRING_ROBOTS.forEach((robot, i) => {
        drawRobot(ctx, robot.x, robot.y, ROBOT_SCALE, colors, i === activeRobot.originIndex ? hatchOpen : 0)
      })

      const robotTarget = edgePointOnCircle(robotOrigin, CENTER, RING_RADIUS)
      const robotAngle = angleOf(robotOrigin, robotTarget)
      // Same top/bottom mirroring as the humans — the two robots above center curve one
      // way, the two below curve the other.
      const robotCurveSign = originRobot.y < CENTER.y ? 1 : -1
      const robotPos = curvedLerpPoint(robotOrigin, robotTarget, robotFlightProgress, FLIGHT_ARC_BULGE * robotCurveSign)

      ctx.save()
      ctx.globalAlpha = projectileAlpha(robotFlightProgress)
      if (activeRobot.kind === 'bomb') {
        drawBomb(ctx, robotPos.x, robotPos.y, colors)
      } else {
        drawMissile(ctx, robotPos.x, robotPos.y, robotAngle, colors)
      }
      ctx.restore()

      ctx.save()
      ctx.globalAlpha = labelRevealAlpha(robotFlightProgress)
      drawLabel(
        ctx,
        activeRobot.label,
        robotPos.x,
        robotPos.y - 30,
        colors.success,
        colors.fontMono,
        LABEL_FONT_SIZE,
        LOGICAL_WIDTH
      )
      ctx.restore()

      drawExplosion(ctx, robotTarget.x, robotTarget.y, impactEnvelope(robotFlightProgress), colors)
    }
  })

  return (
    <div className='relative mx-auto aspect-[660/400] w-[780px] max-w-full'>
      <div aria-hidden='true' className='absolute inset-0'>
        <canvas ref={canvasRef} className='h-full w-full' />
      </div>

      {/* Just the word — no pill/background — sitting exactly on the ring's own
          12-o'clock point (CENTER.y - RING_RADIUS, as a fraction of LOGICAL_HEIGHT),
          inside the clear band. Sized down from text-2xl so its bounding box fits inside
          the band instead of poking past the curved outer/inner border. */}
      <div className='absolute top-[11.25%] left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Text as='span' weight='bold' className='font-mono text-lg text-foreground'>
          vinaya
        </Text>
      </div>

      {/* Same treatment as "vinaya" — plain, no pill — sitting on the ring's own
          6-o'clock point, inside the band. */}
      <div className='absolute top-[88.75%] left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <div className='inline-flex items-center gap-1.5'>
          <Check className='h-3.5 w-3.5 text-success' />
          <Text as='span' size='xs' weight='bold' className='font-mono text-success'>
            checks 12/12
          </Text>
        </div>
      </div>
    </div>
  )
}
