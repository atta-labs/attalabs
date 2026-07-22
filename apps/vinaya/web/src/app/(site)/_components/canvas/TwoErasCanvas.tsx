'use client'

import {
  drawArrow,
  drawBomb,
  drawExplosion,
  drawImpactSpark,
  drawLabel,
  drawMainSphere,
  drawMissile,
  drawRobot,
  drawUniverseFabric,
  drawWorkstation,
  getRobotBodyCenter,
  getWorkstationEmitPoint,
  LABEL_FONT_SIZE,
  ROBOT_FIGURE_HEIGHT_UNITS
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
  type Point,
  projectileAlpha,
  rowCurveSign
} from './geometry'
import { useCanvasScene } from './useCanvasScene'

// ONE canvas for BOTH eras AND both orientations, driven by `kind` + `layout`:
//   • kind    — the crowd figure (seated human vs robot), projectile (arrow vs bomb/missile),
//               and sphere variant (calm vs cracking).
//   • layout  — 'portrait' stacks the crowd ROW above the sphere; 'landscape' puts the crowd
//               COLUMN on the LEFT and the sphere on the RIGHT (firing sideways, like
//               ProtectedCanvas), so the card is wide + short.
// Everything positional reads from LAYOUTS / CONFIG, so the two kinds stay pixel-aligned and
// the whole scene re-flows from the chosen layout.

type EraKind = 'human' | 'agent'
type LayoutKind = 'portrait' | 'landscape'

// Figure unit heights (own head-to-foot span at scale 1) — the human's is the seated
// workstation's span, NOT the taller standing archer, so both render the same pixel height.
const WORKSTATION_UNIT_HEIGHT = 25.7

const ARC_BULGE = 22
const ARROW_TAIL = 60

// Impact DWELL envelope (agent side): quick rise, a long HOLD near full, then a fade — so
// the explosion + red border stay visible for a real beat instead of flashing past.
// `u` is 0 at contact, 1 at the end of the dwell window.
function impactHold(u: number): number {
  if (u < 0.12) return u / 0.12
  if (u < 0.62) return 1
  return clamp01(1 - (u - 0.62) / 0.38)
}
const EMIT_APPEAR_END = 0.06
const EMIT_RELEASE_AT = 0.22
const HATCH_LEAD = 0.16

interface LayoutPreset {
  W: number
  H: number
  sphere: { x: number; y: number; radius: number }
  orient: 'row' | 'col'
  /** row: the crowd's shared visual-center y. col: the crowd column's x. */
  crossAxis: number
  figurePx: number
  css: string
}
const LAYOUTS: Record<LayoutKind, LayoutPreset> = {
  portrait: {
    W: 360,
    H: 437,
    sphere: { x: 180, y: 331, radius: 100 },
    orient: 'row',
    crossAxis: 68, // rowY — crowd row across the top
    figurePx: 96,
    css: 'mx-auto h-[200px] w-[165px]'
  },
  landscape: {
    W: 500,
    H: 300,
    sphere: { x: 370, y: 150, radius: 105 },
    orient: 'col',
    crossAxis: 70, // crowdX — crowd column(s) down the left side
    figurePx: 72, // full-size figures; robots use 2 sub-columns so the stack stays short
    css: 'mx-auto h-[186px] w-[310px]'
  }
}

const HUMAN_LABELS = [
  'quick typo fix',
  'add TODO comment',
  'rename a variable',
  'wrote a test first',
  'small refactor',
  'one-line hotfix',
  'update the docs',
  'clean commit msg',
  'quick config tweak',
  'reviewed a diff'
]
const HUMAN_ORDER = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
const HUMAN_SEQUENCE = HUMAN_ORDER.map((index, i) => ({ index, label: HUMAN_LABELS[i]!, projectile: 'arrow' as const }))

const AGENT_SEQUENCE = [
  { index: 0, label: 'split into 9 repos', projectile: 'bomb' as const },
  { index: 3, label: 'force push to main', projectile: 'missile' as const },
  { index: 1, label: 'YOLO merge #892', projectile: 'bomb' as const },
  { index: 2, label: 'deps: 412 changed', projectile: 'missile' as const },
  { index: 0, label: 'rewrote auth in 3s', projectile: 'bomb' as const },
  { index: 3, label: 'deleted .gitignore', projectile: 'missile' as const },
  { index: 1, label: 'force-pushed prod', projectile: 'bomb' as const },
  { index: 2, label: 'merged without review', projectile: 'missile' as const },
  { index: 0, label: 'regenerated lockfile', projectile: 'bomb' as const },
  { index: 3, label: 'skipped all tests', projectile: 'missile' as const }
]

interface EraConfig {
  unitHeight: number
  count: number
  // Per-kind size multiplier on top of the layout's figurePx (robots read a touch bigger).
  sizeMul: number
  // Figure-height units to offset the anchor from its visual-center line so the VISUAL
  // center (not the anchor) sits on the crowd axis: anchor = center + biasUnits * scale.
  biasUnits: number
  slotMs: number
  turbulence: number
  sequence: { index: number; label: string; projectile: 'arrow' | 'bomb' | 'missile' }[]
  impactMagnitude: number
}

const CONFIG: Record<EraKind, EraConfig> = {
  human: {
    unitHeight: WORKSTATION_UNIT_HEIGHT,
    count: 2,
    sizeMul: 1.4,
    // A workstation's visual center sits ~0.65*scale below its anchor (head above, monitor
    // + base below) — bias the anchor so the center lands on the crowd axis.
    biasUnits: -0.65,
    slotMs: 1700,
    turbulence: 1,
    sequence: HUMAN_SEQUENCE,
    impactMagnitude: 1
  },
  agent: {
    unitHeight: ROBOT_FIGURE_HEIGHT_UNITS,
    count: 4,
    sizeMul: 1.4,
    // drawRobot's anchor sits near the neck; the body reaches 5*scale below it, so the
    // visually-centered anchor sits that far above the axis.
    biasUnits: -5,
    slotMs: 2400,
    turbulence: 1.7,
    sequence: AGENT_SEQUENCE,
    impactMagnitude: 1.7
  }
}

export function TwoErasCanvas({ kind, layout = 'portrait' }: { kind: EraKind; layout?: LayoutKind }) {
  const cfg = CONFIG[kind]
  const L = LAYOUTS[layout]
  const SPHERE = L.sphere
  const isHuman = kind === 'human'
  const scale = (L.figurePx / cfg.unitHeight) * cfg.sizeMul
  // Actual rendered figure height — spacing must track THIS (not the base figurePx), or a
  // sizeMul>1 grows the figures without growing the gaps and they overlap.
  const figPx = L.figurePx * cfg.sizeMul
  const totalCycle = cfg.sequence.length * cfg.slotMs
  const n = cfg.count
  const bias = cfg.biasUnits * scale

  // Crowd positions by layout:
  //  • portrait  — one ROW across the top (varying x).
  //  • landscape — a COLUMN down the left (varying y). Humans are a single column; robots
  //    split into TWO sub-columns so 5 don't stack into a portrait-tall single column.
  const positions: Point[] = ((): Point[] => {
    if (L.orient === 'row') {
      const gap = isHuman ? 22 * scale + 10 : 14 * scale * 1.05 + 4
      return Array.from({ length: n }, (_, i) => ({
        x: SPHERE.x + i * gap - ((n - 1) * gap) / 2,
        y: L.crossAxis + bias
      }))
    }
    if (isHuman) {
      const gap = figPx + 20
      return Array.from({ length: n }, (_, i) => ({
        x: L.crossAxis,
        y: SPHERE.y + (i - (n - 1) / 2) * gap + bias
      }))
    }
    // Robots: 2 sub-columns. Front (closer to the sphere) holds the first ceil(n/2), the
    // back column the rest — every robot still fires; the stack is only ceil(n/2) rows tall.
    const gap = figPx + 18
    const subGap = 14 * scale * 1.05 + 20
    const frontCount = Math.ceil(n / 2)
    return Array.from({ length: n }, (_, i) => {
      const inFront = i < frontCount
      const row = inFront ? i : i - frontCount
      const rows = inFront ? frontCount : n - frontCount
      return {
        x: L.crossAxis + (inFront ? subGap : 0),
        y: SPHERE.y + (row - (rows - 1) / 2) * gap + bias
      }
    })
  })()

  const canvasRef = useCanvasScene({
    logicalWidth: L.W,
    logicalHeight: L.H,
    draw: (ctx, colors, elapsedMs, reducedMotion) => {
      drawUniverseFabric(ctx, colors, elapsedMs, L.W, L.H, reducedMotion, cfg.turbulence)

      // --- sphere: calm for humans, shaking + cracking for agents ---
      let sc: Point = { x: SPHERE.x, y: SPHERE.y }
      if (isHuman) {
        drawMainSphere(ctx, sc.x, sc.y, SPHERE.radius, colors, 'normal', 0)
      } else {
        const shakeT = reducedMotion ? 0 : elapsedMs / 90
        sc = {
          x: SPHERE.x + (reducedMotion ? 0 : Math.sin(shakeT) * 1.8),
          y: SPHERE.y + (reducedMotion ? 0 : Math.cos(shakeT * 1.3) * 1.4)
        }
        const crackPulse = reducedMotion ? 0.7 : (Math.sin(elapsedMs / 260) + 1) / 2
        const crackTime = reducedMotion ? 0.5 : elapsedMs / 4200
        drawMainSphere(ctx, sc.x, sc.y, SPHERE.radius, colors, 'light-speed', crackPulse, crackTime)
      }

      const cyclePos = elapsedMs % totalCycle
      const activeSlot = Math.floor(cyclePos / cfg.slotMs)
      const progress = (cyclePos % cfg.slotMs) / cfg.slotMs
      const active = cfg.sequence[activeSlot]!
      const phase = elapsedMs / 1000

      // --- crowd ---
      positions.forEach((pos, i) => {
        const isActive = i === active.index
        if (isHuman) {
          drawWorkstation(ctx, pos.x, pos.y, scale, colors, phase + i, isActive, i === Math.floor(n / 2))
        } else {
          drawRobot(ctx, pos.x, pos.y, scale, colors, isActive ? hatchEnvelope(progress) : 0)
        }
      })

      // --- the active figure's projectile ---
      const activePos = positions[active.index]!
      const origin = isHuman
        ? getWorkstationEmitPoint(activePos.x, activePos.y, scale)
        : getRobotBodyCenter(activePos.x, activePos.y, scale)
      const target = edgePointOnCircle(origin, sc, SPHERE.radius)
      const throwAngle = angleOf(origin, target)
      // Arc bows outward: row layouts curve by horizontal offset, column layouts by vertical.
      const curveSign = L.orient === 'row' ? rowCurveSign(activePos.x, SPHERE.x) : colCurveSign(activePos.y, sc.y)

      if (isHuman) {
        let headPos: Point
        let objectAlpha: number
        let labelAlpha = 0
        if (progress < EMIT_APPEAR_END) {
          objectAlpha = clamp01(progress / EMIT_APPEAR_END)
          headPos = origin
        } else if (progress < EMIT_RELEASE_AT) {
          objectAlpha = 1
          headPos = origin
        } else {
          const flightT = clamp01((progress - EMIT_RELEASE_AT) / (1 - EMIT_RELEASE_AT))
          objectAlpha = projectileAlpha(flightT)
          labelAlpha = labelRevealAlpha(flightT)
          headPos = curvedLerpPoint(origin, target, flightT, ARC_BULGE * curveSign)
        }
        const tailPos = {
          x: headPos.x - Math.cos(throwAngle) * ARROW_TAIL,
          y: headPos.y - Math.sin(throwAngle) * ARROW_TAIL
        }
        ctx.save()
        ctx.globalAlpha = objectAlpha
        drawArrow(ctx, tailPos.x, tailPos.y, headPos.x, headPos.y, colors)
        ctx.restore()

        ctx.save()
        ctx.globalAlpha = labelAlpha
        drawLabel(ctx, active.label, headPos.x, headPos.y - 20, colors.warning, colors.fontMono, LABEL_FONT_SIZE, L.W)
        ctx.restore()

        const flightT = clamp01((progress - EMIT_RELEASE_AT) / (1 - EMIT_RELEASE_AT))
        // Humans still hit main — smaller, controlled (warning), not the agents' destructive blast.
        drawImpactSpark(ctx, target.x, target.y, impactEnvelope(flightT), colors, 'warning')
      } else {
        // Flight finishes partway through the slot; the remaining tail is an impact DWELL,
        // so the explosion + red border linger long enough to actually see.
        const FLIGHT_SPAN = 0.5
        const arriveAt = HATCH_LEAD + FLIGHT_SPAN
        const flightProgress = clamp01((progress - HATCH_LEAD) / FLIGHT_SPAN)
        const impact = progress <= arriveAt ? 0 : impactHold((progress - arriveAt) / (1 - arriveAt))
        const pos = curvedLerpPoint(origin, target, flightProgress, ARC_BULGE * curveSign)

        ctx.save()
        ctx.globalAlpha = projectileAlpha(flightProgress)
        if (active.projectile === 'bomb') {
          drawBomb(ctx, pos.x, pos.y, colors)
        } else {
          drawMissile(ctx, pos.x, pos.y, throwAngle, colors)
        }
        ctx.restore()

        ctx.save()
        ctx.globalAlpha = labelRevealAlpha(flightProgress)
        drawLabel(ctx, active.label, pos.x, pos.y - 30, colors.destructive, colors.fontMono, LABEL_FONT_SIZE, L.W)
        ctx.restore()

        drawExplosion(ctx, target.x, target.y, impact, colors, cfg.impactMagnitude)

        // The whole sphere border flares red for a beat as the projectile lands — the hit
        // registers on `main` itself, not just at the point of contact.
        if (impact > 0) {
          ctx.save()
          ctx.globalAlpha = impact * 0.6
          ctx.shadowColor = colors.destructive
          ctx.shadowBlur = SPHERE.radius * 0.35
          ctx.strokeStyle = colors.destructive
          ctx.lineWidth = Math.max(2, SPHERE.radius * 0.04)
          ctx.beginPath()
          ctx.arc(sc.x, sc.y, SPHERE.radius, 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
      }
    }
  })

  return (
    <div aria-hidden='true'>
      <canvas ref={canvasRef} className={L.css} />
    </div>
  )
}
