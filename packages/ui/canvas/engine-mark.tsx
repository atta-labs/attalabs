'use client'

// Atta Engine's mark — scattered plan nodes converging through a funnel waypoint into a
// single bordered execution node, ringed by a slowly rotating gear: many possible plans
// resolving into one running graph. The gear is texture, the converging graph is the subject.
//
// Canvas-drawn, no SVG. Geometry is authored in a 300×300 reference space and scaled by the
// rendered size, so the mark stays proportional at any diameter.
//
// Two deliberate departures from the standalone preview this is ported from:
//
//   1. The gear and execution node are scaled up until the mark carries the same visual
//      weight as Vāda's agent trio, Herald's sphere and Vinaya's harness ring — the preview's
//      r37 gear read as a small badge next to them. Tooth depth stays at the preview's ~21%
//      of radius so the profile is unchanged, just bigger.
//   2. Colours resolve from theme tokens, NOT the preview's literal #d9c9a3 / #0a0908 —
//      hardcoded colours are forbidden here (ui-canvas-animation rule 7, ui-patterns RULE 2)
//      and this page has a light mode where fixed hexes would invert wrongly. --primary /
//      --background resolve to those same tones in dark, so the intended look is unchanged.
//
// The particle motion is the preview's, kept intact: cubic-bezier feeders, a per-particle
// speed, a staggered negative start so the flow reads as ongoing, and a hold at the execution
// node before looping.

import { useEffect, useRef } from 'react'
import { withAlpha } from './shared/color-math'
import { resolveColor } from './shared/colors'
import { refreshThemeCache } from './shared/theme'

// Reference box the geometry below is authored against; everything scales from its WIDTH.
// It is taller than it is wide on purpose: the gear alone has to carry the same diameter as
// Vāda's and Herald's spheres, which uses up the full width, so the plan fan needs its own
// band above rather than being squeezed inside the gear's square.
const REF_W = 300
const REF_H = 410
/** Reference height as a multiple of the width — the canvas's aspect ratio. */
const REF_RATIO = REF_H / REF_W

const EXEC = { x: 150, y: 260 }
/** Funnel waypoint every plan edge passes through, sitting just above the gear's top edge. */
const FUNNEL = { x: 150, y: 95 }
/** Plan nodes, scattered asymmetrically across the top band. */
const PLAN_NODES = [
  { x: 40, y: 30 },
  { x: 112, y: 14 },
  { x: 186, y: 22 },
  { x: 266, y: 56 },
  { x: 22, y: 62 }
] as const

const GEAR_TEETH = 20
const GEAR_ROOT = 120
/** Just inside the reference width, so the stroke is not clipped at the canvas edge. */
const GEAR_TIP = 147
/** Fraction of each tooth pitch spent at tip radius — the rest is the root gap. */
const GEAR_TOOTH_SHARE = 0.55
const GEAR_SPEED = 0.004 // rad/frame

const EXEC_RADIUS = 79
const EXEC_DOT_RADIUS = 15

const PLAN_DOT_RADIUS = 6
const FUNNEL_DOT_RADIUS = 5
const PARTICLE_RADIUS = 4.5

const TAU = Math.PI * 2

type Pt = { x: number; y: number }
type Edge = { from: Pt; c1: Pt; c2: Pt; to: Pt }

function cubicPoint(e: Edge, t: number): Pt {
  const mt = 1 - t
  return {
    x: mt * mt * mt * e.from.x + 3 * mt * mt * t * e.c1.x + 3 * mt * t * t * e.c2.x + t * t * t * e.to.x,
    y: mt * mt * mt * e.from.y + 3 * mt * mt * t * e.c1.y + 3 * mt * t * t * e.c2.y + t * t * t * e.to.y
  }
}

/**
 * Each plan node drops vertically before swinging into the funnel. The control offsets are a
 * fraction of the node's own distance to the funnel (rather than the preview's fixed 55/45px)
 * so the S-curve keeps its shape now that the plan band sits closer to the funnel.
 *
 * Edges are built in RENDERED space so the control offsets stay proportional to the scaled
 * endpoints rather than being scaled twice.
 */
function feederEdge(from: Pt, funnel: Pt): Edge {
  const dy = funnel.y - from.y
  return {
    from,
    c1: { x: from.x, y: from.y + dy * 0.44 },
    c2: { x: funnel.x, y: funnel.y - dy * 0.36 },
    to: funnel
  }
}

function trunkEdge(funnel: Pt, exec: Pt): Edge {
  const dy = exec.y - funnel.y
  return {
    from: funnel,
    c1: { x: funnel.x, y: funnel.y + dy * 0.33 },
    c2: { x: exec.x, y: exec.y - dy * 0.33 },
    to: exec
  }
}

type Particle = { edgeIdx: number; t: number; speed: number }

/**
 * The gear as ONE continuous outline — flank, tip arc, flank, root arc, repeated — rather
 * than a ring with separate teeth drawn on top. `ctx.arc` joins each arc to the previous
 * point with a straight line, and that line IS the tooth flank.
 */
function gearPath(ctx: CanvasRenderingContext2D, root: number, tip: number) {
  const step = TAU / GEAR_TEETH
  const toothWidth = step * GEAR_TOOTH_SHARE
  ctx.beginPath()
  for (let i = 0; i < GEAR_TEETH; i++) {
    const center = i * step
    const tipStart = center - toothWidth / 2
    const tipEnd = center + toothWidth / 2
    const rootEnd = center + step - toothWidth / 2
    ctx.lineTo(Math.cos(tipStart) * tip, Math.sin(tipStart) * tip)
    ctx.arc(0, 0, tip, tipStart, tipEnd)
    ctx.lineTo(Math.cos(tipEnd) * root, Math.sin(tipEnd) * root)
    ctx.arc(0, 0, root, tipEnd, rootEnd)
  }
  ctx.closePath()
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  reveal: number,
  gearAngle: number,
  particles: Particle[],
  /** When false the mechanism is drawn exactly as it stands, without advancing. */
  running: boolean
) {
  if (w <= 0 || h <= 0) return
  // Width-driven: the canvas element carries REF_RATIO as its aspect, so the height follows.
  const k = w / REF_W
  const oy = (h - REF_H * k) / 2
  const P = (p: Pt): Pt => ({ x: p.x * k, y: oy + p.y * k })
  const line = (px: number) => Math.max(0.75, px * k)

  const primary = resolveColor('var(--primary)')
  const background = resolveColor('var(--background)')

  const exec = P(EXEC)
  const funnel = P(FUNNEL)
  const planPts = PLAN_NODES.map(P)

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, reveal))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // ── Solid ground: the engine reads as one opaque body, like the spheres do, so the
  // fabric and the cursor light behind it never show through the mechanism.
  ctx.beginPath()
  ctx.arc(exec.x, exec.y, GEAR_ROOT * k, 0, TAU)
  ctx.fillStyle = background
  ctx.fill()

  // ── Gear ring: behind everything, rotating continuously ─────────────────
  ctx.save()
  ctx.translate(exec.x, exec.y)
  ctx.rotate(gearAngle)
  gearPath(ctx, GEAR_ROOT * k, GEAR_TIP * k)
  ctx.strokeStyle = withAlpha(primary, 0.4)
  ctx.lineWidth = line(1.8)
  ctx.stroke()
  ctx.restore()

  const feeders = planPts.map((p) => feederEdge(p, funnel))
  const trunk = trunkEdge(funnel, exec)

  // ── Feeder curves: each plan node into the funnel waypoint ──────────────
  ctx.strokeStyle = withAlpha(primary, 0.25)
  ctx.lineWidth = line(1.6)
  for (const e of feeders) {
    ctx.beginPath()
    ctx.moveTo(e.from.x, e.from.y)
    ctx.bezierCurveTo(e.c1.x, e.c1.y, e.c2.x, e.c2.y, e.to.x, e.to.y)
    ctx.stroke()
  }

  // ── Trunk: funnel down into the execution node ──────────────────────────
  ctx.beginPath()
  ctx.moveTo(trunk.from.x, trunk.from.y)
  ctx.bezierCurveTo(trunk.c1.x, trunk.c1.y, trunk.c2.x, trunk.c2.y, trunk.to.x, trunk.to.y)
  ctx.strokeStyle = withAlpha(primary, 0.45)
  ctx.lineWidth = line(2.2)
  ctx.stroke()

  // ── Plan nodes ──────────────────────────────────────────────────────────
  ctx.fillStyle = primary
  for (const a of planPts) {
    ctx.beginPath()
    ctx.arc(a.x, a.y, PLAN_DOT_RADIUS * k, 0, TAU)
    ctx.fill()
  }

  // ── Funnel waypoint ─────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(funnel.x, funnel.y, FUNNEL_DOT_RADIUS * k, 0, TAU)
  ctx.strokeStyle = primary
  ctx.lineWidth = line(1.8)
  ctx.stroke()

  // ── Execution node: the one running graph ───────────────────────────────
  ctx.beginPath()
  ctx.arc(exec.x, exec.y, EXEC_RADIUS * k, 0, TAU)
  ctx.fillStyle = background
  ctx.fill()
  ctx.strokeStyle = primary
  ctx.lineWidth = line(2.4)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(exec.x, exec.y, EXEC_DOT_RADIUS * k, 0, TAU)
  ctx.fillStyle = primary
  ctx.fill()

  // ── Travelling particles ────────────────────────────────────────────────
  // t < 0 waits at the plan node (staggered starts), 0..1 runs the feeder fading in,
  // 1..1.6 runs the trunk at full strength then holds at the execution node.
  for (const pt of particles) {
    if (running) {
      pt.t += pt.speed
      if (pt.t > 1.6) pt.t = -0.3
    }
    let pos: Pt
    let alpha: number
    const edge = feeders[pt.edgeIdx]
    if (!edge) continue
    if (pt.t < 0) {
      continue
    }
    if (pt.t <= 1) {
      pos = cubicPoint(edge, pt.t)
      alpha = Math.min(1, pt.t * 3)
    } else {
      pos = cubicPoint(trunk, Math.min((pt.t - 1) * 1.6, 1))
      alpha = 1
    }
    if (alpha <= 0) continue
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, PARTICLE_RADIUS * k, 0, TAU)
    ctx.fillStyle = withAlpha(primary, alpha)
    ctx.fill()
  }

  ctx.restore()
}

export function EngineMark({ revealProgress, running = true }: { revealProgress: number; running?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const revealRef = useRef(revealProgress)
  revealRef.current = revealProgress
  const runningRef = useRef(running)
  runningRef.current = running
  // Gear angle and particle phases live OUTSIDE the effect so a stop/start does not rewind
  // the mechanism — it picks up exactly where it was parked.
  const gearAngleRef = useRef(0)
  const particlesRef = useRef<Particle[] | null>(null)
  if (!particlesRef.current) {
    particlesRef.current = PLAN_NODES.map((_, i) => ({
      edgeIdx: i,
      t: -(i * 0.22),
      speed: 0.006 + Math.random() * 0.002
    }))
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const particles = particlesRef.current
    if (!canvas || !ctx || !particles) return
    let raf = 0

    const render = () => {
      refreshThemeCache()
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const live = runningRef.current
      draw(ctx, w, h, revealRef.current, gearAngleRef.current, particles, live)
      if (live) gearAngleRef.current += GEAR_SPEED

      // Parked ⇒ stop the loop. The canvas keeps its last frame, so the mark stays on screen
      // as a still and costs nothing while the reader is elsewhere.
      //
      // This deliberately does NOT also wait for the reveal to finish. Gating on
      // `reveal < 1` looked safer (don't freeze a half-drawn mark) but inverted the whole
      // point: a mark that is never revealed has `reveal === 0` forever, so the loop it was
      // meant to park ran for the entire visit. The still-ramping case is covered instead by
      // the one-shot redraw effect below, which repaints on every `revealProgress` change
      // while parked.
      if (live) raf = requestAnimationFrame(render)
      else raf = 0
    }
    raf = requestAnimationFrame(render)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [running])

  // Parked repaint: while the gear is not turning the mark still has to reflect a changing
  // `revealProgress` (the section can be scrolling into view before the timeline head gets
  // there). One frame per change, no loop.
  useEffect(() => {
    if (running) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const particles = particlesRef.current
    if (!canvas || !ctx || !particles) return
    refreshThemeCache()
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    draw(ctx, w, h, revealProgress, gearAngleRef.current, particles, false)
  }, [running, revealProgress])

  // The parent box is the same square every other mark gets. This canvas is taller than that
  // box and hangs off the top of it, positioned so the GEAR's centre — not the canvas's —
  // lands on the box's centre. That is what lets the gear carry the exact diameter of Vāda's
  // and Herald's spheres while the plan fan still has room to sit above it. Both values are
  // percentages of the square parent, so the alignment holds at any mark size.
  return (
    <canvas
      ref={canvasRef}
      className='pointer-events-none absolute left-0 w-full'
      style={{
        top: `${(0.5 - (EXEC.y / REF_H) * REF_RATIO) * 100}%`,
        height: `${REF_RATIO * 100}%`
      }}
    />
  )
}
