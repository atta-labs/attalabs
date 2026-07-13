import { clamp01, lerp, type Point } from './geometry'
import type { ThemeColors } from './theme-colors'

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

/** Hand-drawn approximation of lucide's git-branch glyph — canvas can't import a React icon. */
function drawGitBranchGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(1, r * 0.22)
  ctx.lineCap = 'round'

  const leftX = cx - r * 0.5
  const rightX = cx + r * 0.5
  const topY = cy - r * 0.9
  const midY = cy
  const botY = cy + r * 0.9

  line(ctx, leftX, topY, leftX, botY)

  ctx.beginPath()
  ctx.moveTo(leftX, midY)
  ctx.bezierCurveTo(leftX + r * 0.5, midY, rightX - r * 0.5, topY, rightX, topY)
  ctx.stroke()

  const nodeR = r * 0.24
  for (const [x, y] of [
    [leftX, topY],
    [leftX, botY],
    [rightX, topY]
  ] as const) {
    ctx.beginPath()
    ctx.arc(x, y, nodeR, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export type MainSphereVariant = 'normal' | 'light-speed' | 'protected'

/**
 * Jagged egg-crack paths for the `light-speed` variant, each a short zigzag of points
 * (radius-relative offsets from center) rather than a single straight line. Every path
 * stays well clear of the centered "main" label + git-branch glyph (the text zone is
 * roughly |dx| < 0.4, dy between -0.3 and 0.5) — cracks live in the four outer corners,
 * radiating toward the rim.
 */
const SPHERE_CRACKS: { phase: number; points: readonly { dx: number; dy: number }[] }[] = [
  {
    phase: 0,
    points: [
      { dx: -0.55, dy: -0.55 },
      { dx: -0.68, dy: -0.42 },
      { dx: -0.6, dy: -0.32 },
      { dx: -0.8, dy: -0.24 },
      { dx: -0.7, dy: -0.16 },
      { dx: -0.92, dy: -0.12 }
    ]
  },
  {
    phase: 0.27,
    points: [
      { dx: 0.42, dy: -0.58 },
      { dx: 0.55, dy: -0.46 },
      { dx: 0.46, dy: -0.36 },
      { dx: 0.68, dy: -0.3 },
      { dx: 0.58, dy: -0.22 },
      { dx: 0.88, dy: -0.18 }
    ]
  },
  {
    phase: 0.55,
    points: [
      { dx: 0.5, dy: 0.48 },
      { dx: 0.62, dy: 0.36 },
      { dx: 0.52, dy: 0.28 },
      { dx: 0.75, dy: 0.22 },
      { dx: 0.63, dy: 0.15 },
      { dx: 0.9, dy: 0.14 }
    ]
  },
  {
    phase: 0.8,
    points: [
      { dx: -0.48, dy: 0.52 },
      { dx: -0.6, dy: 0.4 },
      { dx: -0.5, dy: 0.3 },
      { dx: -0.72, dy: 0.24 },
      { dx: -0.6, dy: 0.16 },
      { dx: -0.88, dy: 0.14 }
    ]
  }
]

/** Draws only the first `growth` (0..1) fraction of a crack's total path length. */
function drawGrowingCrack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  points: readonly { dx: number; dy: number }[],
  growth: number
) {
  const abs = points.map((p) => ({ x: cx + p.dx * radius, y: cy + p.dy * radius }))
  const segLens: number[] = []
  let total = 0
  for (let i = 1; i < abs.length; i++) {
    const d = Math.hypot(abs[i]!.x - abs[i - 1]!.x, abs[i]!.y - abs[i - 1]!.y)
    segLens.push(d)
    total += d
  }
  const targetLen = total * clamp01(growth)

  ctx.beginPath()
  ctx.moveTo(abs[0]!.x, abs[0]!.y)
  let covered = 0
  for (let i = 1; i < abs.length; i++) {
    const segLen = segLens[i - 1]!
    if (covered + segLen <= targetLen) {
      ctx.lineTo(abs[i]!.x, abs[i]!.y)
      covered += segLen
    } else {
      const t = segLen > 0 ? (targetLen - covered) / segLen : 0
      ctx.lineTo(lerp(abs[i - 1]!.x, abs[i]!.x, clamp01(t)), lerp(abs[i - 1]!.y, abs[i]!.y, clamp01(t)))
      break
    }
  }
  ctx.stroke()
}

/**
 * The shared "main" sphere every scene composes from. `crackPulse` (0..1) only affects
 * the `light-speed` variant's crack-line opacity; `crackTime` (slowly increasing, one
 * unit per full cycle) drives each crack growing/receding little by little, staggered
 * by its own phase so they don't all move together; other variants ignore both.
 */
export function drawMainSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  colors: ThemeColors,
  variant: MainSphereVariant,
  crackPulse: number,
  crackTime = 0
) {
  ctx.save()

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fillStyle = colors.card
  ctx.fill()

  ctx.save()
  ctx.globalAlpha = 0.2
  ctx.lineWidth = Math.max(1, radius * 0.02)
  ctx.strokeStyle = colors.foreground
  ctx.stroke()
  ctx.restore()

  if (variant === 'normal') {
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.strokeStyle = colors.mutedForeground
    ctx.lineWidth = 1
    line(ctx, cx - radius * 0.55, cy - radius * 0.1, cx + radius * 0.2, cy + radius * 0.12)
    line(ctx, cx - radius * 0.3, cy + radius * 0.32, cx + radius * 0.5, cy + radius * 0.18)
    ctx.strokeStyle = colors.warning
    line(ctx, cx - radius * 0.45, cy - radius * 0.45, cx - radius * 0.25, cy - radius * 0.3)
    line(ctx, cx + radius * 0.3, cy + radius * 0.4, cx + radius * 0.48, cy + radius * 0.28)
    ctx.restore()
  }

  if (variant === 'light-speed') {
    ctx.save()
    ctx.strokeStyle = colors.destructive
    ctx.lineWidth = Math.max(1.5, radius * 0.025)
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.4 + crackPulse * 0.6

    for (const crack of SPHERE_CRACKS) {
      const growth = 0.35 + 0.65 * ((Math.sin((crackTime + crack.phase) * Math.PI * 2) + 1) / 2)
      drawGrowingCrack(ctx, cx, cy, radius, crack.points, growth)
    }
    ctx.restore()
  }

  ctx.fillStyle = colors.foreground
  ctx.font = `700 ${Math.round(radius * 0.32)}px ${colors.fontMono}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('main', cx, cy - radius * 0.12)

  drawGitBranchGlyph(ctx, cx, cy + radius * 0.34, radius * 0.16, colors.mutedForeground)

  ctx.restore()
}

const SHOULDER_OFFSET = { x: 0, y: -15 }
const ARM_LENGTH = 13
const ELBOW_BEND_MAX = 0.85
const LUNGE_DISTANCE = 3.5
// Kept modest on purpose: ARM_LENGTH scales with the figure, so at large HUMAN_SCALE a
// wide swing travels far enough in absolute px to swing the hand up over the head.
const ARM_WINDUP_DELTA = -1.3
const ARM_RECOVER_DELTA = -0.55
// Longer than the release/follow-through phases on purpose — a real archer's draw
// (reaching back, nocking, pulling to full draw) is the slow, deliberate half of the
// motion; the release itself is a snap. Rushing the windup is what made it unreadable.
const ARM_WINDUP_END = 0.22
const ARM_RELEASE_END = 0.3
const ARM_FOLLOW_END = 0.42

/** A held arrow (or any grabbed projectile) rests near the figure until this point in the cycle. */
export const SPEAR_APPEAR_END = 0.06
/** Then it's picked up, tracking the hand from here until it leaves the hand at release. */
export const SPEAR_GRAB_END = 0.14
/** The exact progress the arm reaches full extension at `throwAngle` — hand-off point from "held" to "ballistic". */
export const SPEAR_RELEASE_AT = ARM_RELEASE_END

function easeInCubic(t: number): number {
  return t * t * t
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

export interface ThrowPose {
  /** Current angle of the whole arm (shoulder -> hand). */
  angle: number
  /** 0 = fully extended (whip release), 1 = sharply bent (cocked back). */
  bend: number
}

/**
 * A javelin-style windup/whip/recover cycle, not a mechanical constant-speed sweep:
 * slow deliberate cock-back (eased out), a fast whip-through release (eased in), a
 * brief extended follow-through, then an easing recovery back toward the next windup.
 * Releases exactly ON `throwAngle` at `bend = 0` (arm fully extended) — the arrow's
 * launch point is derived from this same angle+bend pair, so it can never drift.
 */
export function throwArmPose(throwAngle: number, progress: number): ThrowPose {
  if (progress < ARM_WINDUP_END) {
    const t = easeOutCubic(progress / ARM_WINDUP_END)
    return { angle: throwAngle + lerp(0, ARM_WINDUP_DELTA, t), bend: lerp(0.3, 1, t) }
  }
  if (progress < ARM_RELEASE_END) {
    const t = easeInCubic((progress - ARM_WINDUP_END) / (ARM_RELEASE_END - ARM_WINDUP_END))
    return { angle: lerp(throwAngle + ARM_WINDUP_DELTA, throwAngle, t), bend: lerp(1, 0, t) }
  }
  if (progress < ARM_FOLLOW_END) {
    return { angle: throwAngle, bend: 0 }
  }
  const t = easeInOutCubic((progress - ARM_FOLLOW_END) / (1 - ARM_FOLLOW_END))
  return { angle: lerp(throwAngle, throwAngle + ARM_RECOVER_DELTA, t), bend: lerp(0, 0.3, t) }
}

function throwShoulder(x: number, y: number, scale: number, angle: number, bend: number): Point {
  const lungeFactor = clamp01((0.5 - bend) / 0.5)
  return {
    x: x + SHOULDER_OFFSET.x * scale + Math.cos(angle) * lungeFactor * LUNGE_DISTANCE * scale,
    y: y + SHOULDER_OFFSET.y * scale + Math.sin(angle) * lungeFactor * LUNGE_DISTANCE * scale
  }
}

/**
 * The hand's position for ANY pose — the exact same formula `drawHuman` uses internally.
 * Single source of truth: a held arrow can track the hand through grab/windup/release by
 * calling this at the human's current pose every frame, so it can never drift from where
 * the arm is actually drawn.
 */
export function getHandPosition(x: number, y: number, scale: number, pose: ThrowPose): Point {
  const shoulder = throwShoulder(x, y, scale, pose.angle, pose.bend)
  return {
    x: shoulder.x + Math.cos(pose.angle) * ARM_LENGTH * scale,
    y: shoulder.y + Math.sin(pose.angle) * ARM_LENGTH * scale
  }
}

/** The hand's position AT RELEASE specifically — `getHandPosition` at `{ angle: throwAngle, bend: 0 }`. */
export function getHumanThrowPoint(x: number, y: number, scale: number, throwAngle: number): Point {
  return getHandPosition(x, y, scale, { angle: throwAngle, bend: 0 })
}

/**
 * Stick figure with an animated throwing arm: cocked elbow during windup straightens
 * into a full-extension whip at release, with a slight forward lunge as the arm
 * extends — reads as an actual throwing motion, not a hinge swinging on a fixed pivot.
 */
export function drawHuman(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colors: ThemeColors,
  pose: ThrowPose
) {
  ctx.save()
  ctx.strokeStyle = colors.foreground
  ctx.lineWidth = 2.4 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.arc(x, y - 22 * scale, 4 * scale, 0, Math.PI * 2)
  ctx.stroke()

  line(ctx, x, y - 18 * scale, x, y - 4 * scale)

  // This is the draw arm — cocked back during windup (bowstring pulled to the cheek),
  // whipping forward through release (string and arrow leaving the hand together).
  const shoulder = throwShoulder(x, y, scale, pose.angle, pose.bend)
  const elbowAngle = pose.angle - ELBOW_BEND_MAX * pose.bend
  const elbow = {
    x: shoulder.x + Math.cos(elbowAngle) * ARM_LENGTH * 0.55 * scale,
    y: shoulder.y + Math.sin(elbowAngle) * ARM_LENGTH * 0.55 * scale
  }
  const hand = {
    x: shoulder.x + Math.cos(pose.angle) * ARM_LENGTH * scale,
    y: shoulder.y + Math.sin(pose.angle) * ARM_LENGTH * scale
  }
  // Shoulder->elbow->hand as ONE continuous path (not two separate `line()` calls) so
  // the elbow renders as a single clean round join, not two overlapping round line-caps
  // stacking into a blob — that double-cap overlap is what read as "undefined" at a
  // sharply bent elbow during windup.
  ctx.beginPath()
  ctx.moveTo(shoulder.x, shoulder.y)
  ctx.lineTo(elbow.x, elbow.y)
  ctx.lineTo(hand.x, hand.y)
  ctx.stroke()

  line(ctx, x, y - 4 * scale, x - 6 * scale, y + 10 * scale)
  line(ctx, x, y - 4 * scale, x + 6 * scale, y + 10 * scale)

  ctx.restore()
}

const BOW_ARM_LENGTH = ARM_LENGTH * 1.05
const BOW_TIP_SPAN = 7

/**
 * The other arm — the one `drawHuman` doesn't animate — held out steady toward `angle`,
 * bow in hand. Static on purpose: a real archer's bow arm doesn't move through the shot,
 * only the draw arm does (that's `drawHuman`'s animated one).
 *
 * `drawHand`, when given, is the draw hand's own live position (the exact same point
 * `getHandPosition` computes for `drawHuman`'s animated arm) — the string bends back to
 * meet it, taut at full draw and relaxing toward the tips as the arm extends through
 * release, instead of a bow with no visible string at all.
 */
export function drawBow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colors: ThemeColors,
  angle: number,
  drawHand?: Point
) {
  ctx.save()
  ctx.strokeStyle = colors.foreground
  ctx.lineWidth = 2.4 * scale
  ctx.lineCap = 'round'

  const shoulder = { x: x + SHOULDER_OFFSET.x * scale, y: y + SHOULDER_OFFSET.y * scale }
  const hand = {
    x: shoulder.x + Math.cos(angle) * BOW_ARM_LENGTH * scale,
    y: shoulder.y + Math.sin(angle) * BOW_ARM_LENGTH * scale
  }
  line(ctx, shoulder.x, shoulder.y, hand.x, hand.y)

  ctx.save()
  ctx.translate(hand.x, hand.y)
  ctx.rotate(angle)
  ctx.strokeStyle = colors.mutedForeground
  ctx.lineWidth = 1.3 * scale
  ctx.beginPath()
  ctx.moveTo(0, -BOW_TIP_SPAN * scale)
  ctx.quadraticCurveTo(2.6 * scale, 0, 0, BOW_TIP_SPAN * scale)
  ctx.stroke()
  ctx.restore()

  // Tips are the same two points the bow arc above starts/ends at, in world space
  // (local ±BOW_TIP_SPAN perpendicular to `angle`, at the bow hand).
  const perpX = -Math.sin(angle)
  const perpY = Math.cos(angle)
  const tipA = { x: hand.x + perpX * BOW_TIP_SPAN * scale, y: hand.y + perpY * BOW_TIP_SPAN * scale }
  const tipB = { x: hand.x - perpX * BOW_TIP_SPAN * scale, y: hand.y - perpY * BOW_TIP_SPAN * scale }

  ctx.strokeStyle = colors.mutedForeground
  ctx.lineWidth = 1 * scale
  ctx.beginPath()
  ctx.moveTo(tipA.x, tipA.y)
  if (drawHand) {
    ctx.lineTo(drawHand.x, drawHand.y)
    ctx.lineTo(tipB.x, tipB.y)
  } else {
    ctx.lineTo(tipB.x, tipB.y)
  }
  ctx.stroke()

  ctx.restore()
}

const BACKPACK_OFFSET = { x: 5, y: -14 }

/**
 * Where a backpack-carried arrow rests, on the OUTWARD side of the figure's back (away
 * from the row's center, matching how the rest of the figure mirrors via `facing`) —
 * single source of truth shared by `drawBackpack` and the scene's own grab-phase math.
 */
export function getBackpackMouth(x: number, y: number, scale: number, facing: 1 | -1): Point {
  return { x: x + BACKPACK_OFFSET.x * facing * scale, y: y + BACKPACK_OFFSET.y * scale }
}

/** A small quiver pouch on the back, with two arrow shafts already poking out of it. */
export function drawBackpack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colors: ThemeColors,
  facing: 1 | -1
) {
  const mouth = getBackpackMouth(x, y, scale, facing)
  ctx.save()

  ctx.beginPath()
  ctx.roundRect(mouth.x - 2.3 * scale * facing, mouth.y - 1.3 * scale, 4.6 * scale * facing, 8 * scale, 1 * scale)
  ctx.fillStyle = colors.background
  ctx.fill()
  ctx.strokeStyle = colors.foreground
  ctx.lineWidth = 1.1 * scale
  ctx.stroke()

  ctx.strokeStyle = colors.mutedForeground
  ctx.lineWidth = 0.9 * scale
  ctx.lineCap = 'round'
  line(ctx, mouth.x - 0.9 * scale * facing, mouth.y - 0.7 * scale, mouth.x - 2.2 * scale * facing, mouth.y - 6 * scale)
  line(
    ctx,
    mouth.x + 0.9 * scale * facing,
    mouth.y - 0.7 * scale,
    mouth.x + 0.4 * scale * facing,
    mouth.y - 6.5 * scale
  )

  ctx.restore()
}

/**
 * The body square's own center — i.e. `drawRobot`'s own `bodyY + bodyH / 2` formula.
 * Single source of truth: a projectile's origin must be this point, not the robot's
 * anchor (which sits at the neck), or it visually erupts from above the body instead of
 * from inside it.
 */
export function getRobotBodyCenter(x: number, y: number, scale: number): Point {
  return { x, y: y + 13 * scale }
}

/**
 * Small robot — antenna, head with two eye-dots, a square body — legible at ~20-24px.
 * The body square is ALWAYS drawn whole, frame intact — `hatchOpen` (0..1) only reveals
 * a glowing launch bay + door-seam lines inside it, so the firing robot's own body is
 * visibly the missile bay without the square ever disappearing.
 */
export function drawRobot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  colors: ThemeColors,
  hatchOpen = 0
) {
  ctx.save()
  const w = 14 * scale
  const h = 10 * scale

  ctx.strokeStyle = colors.foreground
  ctx.lineWidth = 1.4 * scale
  line(ctx, x, y - h / 2 - 6 * scale, x, y - h / 2 - 1 * scale)
  ctx.beginPath()
  ctx.arc(x, y - h / 2 - 6 * scale, 1.2 * scale, 0, Math.PI * 2)
  ctx.fillStyle = colors.foreground
  ctx.fill()

  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2 - 1 * scale, w, h, 2 * scale)
  ctx.fillStyle = colors.background
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = colors.destructive
  ctx.beginPath()
  ctx.arc(x - w * 0.22, y - h * 0.02, 1.3 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + w * 0.22, y - h * 0.02, 1.3 * scale, 0, Math.PI * 2)
  ctx.fill()

  const bodyW = w * 1.05
  const bodyH = h * 1.6
  const bodyY = y + h / 2

  ctx.beginPath()
  ctx.roundRect(x - bodyW / 2, bodyY, bodyW, bodyH, 1.5 * scale)
  ctx.fillStyle = colors.background
  ctx.fill()

  if (hatchOpen > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x - bodyW / 2, bodyY, bodyW, bodyH, 1.5 * scale)
    ctx.clip()

    ctx.globalAlpha = hatchOpen
    ctx.fillStyle = colors.warning
    ctx.beginPath()
    ctx.arc(x, bodyY + bodyH / 2, bodyH * 0.6, 0, Math.PI * 2)
    ctx.fill()

    const seamGap = hatchOpen * bodyW * 0.32
    ctx.globalAlpha = 1
    ctx.strokeStyle = colors.foreground
    ctx.lineWidth = Math.max(1, scale * 0.6)
    line(ctx, x - seamGap, bodyY, x - seamGap, bodyY + bodyH)
    line(ctx, x + seamGap, bodyY, x + seamGap, bodyY + bodyH)
    ctx.restore()
  }

  ctx.strokeStyle = colors.foreground
  ctx.lineWidth = 1.4 * scale
  ctx.beginPath()
  ctx.roundRect(x - bodyW / 2, bodyY, bodyW, bodyH, 1.5 * scale)
  ctx.stroke()

  ctx.restore()
}

/**
 * A fixed-length arrow translating along `(x1,y1) -> (x2,y2)` (its current animated
 * nock/tip), oriented tip-first. Thin shaft + small triangular head + a V of fletching
 * at the nock end — a slender arrow, not a heavy spear.
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  colors: ThemeColors
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const length = Math.hypot(x2 - x1, y2 - y1) || 1

  ctx.save()
  ctx.translate(x1, y1)
  ctx.rotate(angle)

  const headLen = Math.min(length * 0.18, 9)
  const shaftLen = length - headLen

  ctx.beginPath()
  ctx.moveTo(0, -0.9)
  ctx.lineTo(shaftLen, -0.9)
  ctx.lineTo(shaftLen, 0.9)
  ctx.lineTo(0, 0.9)
  ctx.closePath()
  ctx.fillStyle = colors.mutedForeground
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(shaftLen, -2.6)
  ctx.lineTo(length, 0)
  ctx.lineTo(shaftLen, 2.6)
  ctx.closePath()
  ctx.fillStyle = colors.warning
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(0, -0.9)
  ctx.lineTo(-5, -3.6)
  ctx.lineTo(1.5, 0)
  ctx.lineTo(-5, 3.6)
  ctx.lineTo(0, 0.9)
  ctx.closePath()
  ctx.fillStyle = colors.warning
  ctx.fill()

  ctx.restore()
}

const PROJECTILE_SCALE = 2.6

/**
 * A pod, not a filled blob — outline + background fill + a small colored porthole,
 * the same construction language as `drawRobot` (outline body, background fill,
 * colored accent dots) so the whole cast reads as one family of shapes.
 */
export function drawBomb(ctx: CanvasRenderingContext2D, x: number, y: number, colors: ThemeColors) {
  ctx.save()
  const r = 7 * PROJECTILE_SCALE

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = colors.background
  ctx.fill()
  ctx.strokeStyle = colors.foreground
  ctx.lineWidth = 1.6
  ctx.stroke()

  ctx.fillStyle = colors.destructive
  ctx.font = `700 ${Math.round(r * 0.62)}px ${colors.fontMono}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('</>', x, y)

  ctx.strokeStyle = colors.warning
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  line(ctx, x + r * 0.55, y - r * 0.55, x + r * 1.05, y - r * 1.15)
  ctx.beginPath()
  ctx.arc(x + r * 1.05, y - r * 1.15, 1.8, 0, Math.PI * 2)
  ctx.fillStyle = colors.warning
  ctx.fill()

  ctx.restore()
}

/**
 * Outlined pod body + fin + nose, same construction language as `drawRobot` (outline,
 * background fill, colored accent), oriented along its actual direction of travel.
 */
export function drawMissile(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, colors: ThemeColors) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const s = PROJECTILE_SCALE

  ctx.beginPath()
  ctx.moveTo(-9 * s, 0)
  ctx.lineTo(-14 * s, -4.5 * s)
  ctx.lineTo(-9 * s, -1.5 * s)
  ctx.lineTo(-14 * s, 4.5 * s)
  ctx.lineTo(-9 * s, 1.5 * s)
  ctx.closePath()
  ctx.fillStyle = colors.background
  ctx.fill()
  ctx.strokeStyle = colors.warning
  ctx.lineWidth = 1.4
  ctx.stroke()

  ctx.beginPath()
  ctx.roundRect(-9 * s, -3 * s, 14 * s, 6 * s, 2 * s)
  ctx.fillStyle = colors.background
  ctx.fill()
  ctx.strokeStyle = colors.foreground
  ctx.lineWidth = 1.6
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(-2 * s, 0, 1.7 * s, 0, Math.PI * 2)
  ctx.fillStyle = colors.destructive
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(5 * s, -3 * s)
  ctx.lineTo(12 * s, 0)
  ctx.lineTo(5 * s, 3 * s)
  ctx.closePath()
  ctx.fillStyle = colors.background
  ctx.fill()
  ctx.strokeStyle = colors.destructive
  ctx.lineWidth = 1.4
  ctx.stroke()

  ctx.restore()
}

/**
 * A shockwave, not a single ring: two rings expanding outward at different rates plus a
 * bright core flash, all keyed off the same `alpha` envelope (1 at peak impact, fading
 * to 0) — center is the exact edge-point the projectile actually landed on.
 */
export function drawImpactSpark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha: number,
  colors: ThemeColors,
  tone: 'warning' | 'success',
  magnitude = 1
) {
  if (alpha <= 0) return
  const color = tone === 'success' ? colors.success : colors.warning
  const life = 1 - alpha
  // Ease-out: the wave expands fast at first, then visibly decelerates — a real
  // shockwave, not a linear dilation that reads as sped up.
  const easedLife = 1 - (1 - life) ** 2

  ctx.save()

  ctx.globalAlpha = alpha * 0.85
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5 * magnitude
  ctx.beginPath()
  ctx.arc(x, y, (6 + easedLife * 26) * magnitude, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = alpha * 0.5
  ctx.lineWidth = 1.5 * magnitude
  ctx.beginPath()
  ctx.arc(x, y, (4 + easedLife * 15) * magnitude, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = alpha * alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, 3.5 * magnitude, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export const LABEL_FONT_SIZE = 18

/** Always called with the projectile's own live (x, y) so text can never desync from it. */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  fontMono: string,
  fontSize: number = LABEL_FONT_SIZE
) {
  ctx.save()
  ctx.font = `600 ${fontSize}px ${fontMono}`
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(text, x, y)
  ctx.restore()
}

/**
 * A CLEAR band — two thin border circles (outer + inner edge) with nothing solid filled
 * between them, wide enough that the "vinaya" text (positioned separately, at the ring's
 * own 12-o'clock point) reads as sitting inside the band. A thin dashed accent travels
 * around the band for motion; it must stay thin, not fill the band solid.
 */
export function drawOrbitRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  dashOffset: number,
  colors: ThemeColors
) {
  ctx.save()
  // Thick enough that "checks 12/12" (the widest of the ring-band labels) has real
  // vertical room even at its curved left/right edges, where a flat line of text sits
  // farther from the true top/bottom of the circle than its own centered point does.
  const bandHalfWidth = radius * 0.17

  ctx.lineWidth = 1.5
  ctx.strokeStyle = colors.border
  ctx.beginPath()
  ctx.arc(cx, cy, radius + bandHalfWidth, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, radius - bandHalfWidth, 0, Math.PI * 2)
  ctx.stroke()

  // Two moving dashed accents, one hugging the outer edge and one the inner edge of the
  // band — neither sits on the centerline, where "vinaya" sits at 12 o'clock, so neither
  // crosses the text. This is what makes the band itself read as "a ring with 2 borders",
  // not just a static outline with one animated line.
  ctx.lineWidth = bandHalfWidth * 0.2
  ctx.setLineDash([radius * 0.19, radius * 0.09])
  ctx.lineDashOffset = dashOffset
  ctx.lineCap = 'round'
  ctx.strokeStyle = colors.primary

  ctx.beginPath()
  ctx.arc(cx, cy, radius + bandHalfWidth * 0.85, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, radius - bandHalfWidth * 0.85, 0, Math.PI * 2)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.restore()
}
