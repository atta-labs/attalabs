'use client'

// Vinaya's mark — the harness ring, canvas-drawn (ported from apps/vinaya-portal/web's SVG
// HarnessStructure so "no SVG anywhere" holds across every mark), standalone — same
// composition as the real site: a ring clamping onto a small `main` hub at its center, not
// enclosing any other product's mark. Same staged reveal as the original: hexagonal screws
// rise from the fabric first, then each ring band deploys out of its screw, then gripper
// columns extend and clamp inward onto the hub, then electricity sparks across the gaps, then
// the hub itself (circle + "main" + a small branch glyph, canvas-drawn — the real site's
// MainBranchNode is SVG, this one isn't, to keep "no SVG anywhere" true) fades in.

import { useEffect, useRef } from 'react'
import { withAlpha } from './shared/color-math'
import { resolveColor } from './shared/colors'
import { CONDUIT_ANGLES_DEG, offsetPoint, polar, RING_AXIS_DEG, round } from './shared/harness-geometry'
import { refreshThemeCache } from './shared/theme'

const ARC_HALF = 33 // each ring segment spans 66°, leaving 24° gaps on the diagonals
const EASE = (t: number) => 1 - (1 - t) ** 3
const cl = (x: number) => Math.max(0, Math.min(1, x))

function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

function hexPoints(r: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) })
  }
  return pts
}

function pathPolygon(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  const first = pts[0]
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]!
    ctx.lineTo(p.x, p.y)
  }
  ctx.closePath()
}

// One ring-segment outline (outer arc + caps + inner arc).
function segPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  s0: number,
  s1: number
) {
  const r0 = (s0 * Math.PI) / 180
  const r1 = (s1 * Math.PI) / 180
  ctx.beginPath()
  ctx.arc(cx, cy, rOut, r0, r1, false)
  ctx.arc(cx, cy, rIn, r1, r0, true)
  ctx.closePath()
}

// A curved metal band (outer arc + caps + inner arc) — gripper clamps.
function bandPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  ri: number,
  ro: number,
  a0: number,
  a1: number
) {
  const r0 = (a0 * Math.PI) / 180
  const r1 = (a1 * Math.PI) / 180
  ctx.beginPath()
  ctx.arc(cx, cy, ro, r0, r1, false)
  ctx.arc(cx, cy, ri, r1, r0, true)
  ctx.closePath()
}

const WAVE_VARIANTS = [
  { samples: 22, amplitude: 0.6, width: 1.6, speed: 0.09, dir: 1, opacity: 0.9, seed: 0, band: -1 },
  { samples: 20, amplitude: 0.55, width: 1.2, speed: 0.12, dir: -1, opacity: 0.68, seed: 40, band: 1 }
]

function drawWaveArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
  samples: number,
  ampPx: number,
  time: number,
  seed: number,
  reveal: number, // 0..1 — progressively draws the polyline (dash-on effect)
  color: string,
  width: number,
  opacity: number
) {
  if (reveal <= 0.001) return
  const startRad = (startDeg * Math.PI) / 180
  const span = ((endDeg - startDeg) * Math.PI) / 180
  const shown = Math.max(1, Math.round(samples * reveal))
  ctx.beginPath()
  for (let i = 0; i <= shown; i++) {
    const t = i / samples
    const env = Math.sin(t * Math.PI)
    const h1 = hash01(i + seed)
    const h2 = hash01(i + seed + 97)
    const off = Math.sin(i * 1.5 - time + h1 * 6.283) * 0.62 + Math.sin(i * 5.3 - time * 1.9 + h2 * 6.283) * 0.38
    const r = radius + off * ampPx * env
    const angJit = (hash01(i + seed + 50) - 0.5) * span * 0.07
    const angle = startRad + span * t + angJit
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = withAlpha(color, opacity)
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

// Hub — the "main" node the gripper columns clamp onto. Circle + "main" + a small
// branch glyph (two child nodes off a trunk, matching lucide's GitBranch silhouette closely
// enough to read at this size), all canvas-drawn. Fades in as the clamp finishes.
function drawHub(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number) {
  if (alpha <= 0.001) return
  const primary = resolveColor('var(--primary)')
  const secondary = resolveColor('var(--secondary)')

  ctx.save()
  ctx.globalAlpha = alpha

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = secondary
  ctx.fill()
  ctx.strokeStyle = primary
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = primary
  ctx.font = `700 ${Math.round(r * 0.34)}px var(--font-mono, monospace)`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('main', cx, cy - r * 0.32)

  // Branch glyph — trunk node + two child nodes off a short curve, GitBranch-like.
  const gx = cx - r * 0.16
  const gy = cy + r * 0.18
  const s = r * 0.22
  ctx.beginPath()
  ctx.moveTo(gx, gy - s)
  ctx.lineTo(gx, gy + s)
  ctx.strokeStyle = primary
  ctx.lineWidth = 1.75
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(gx, gy)
  ctx.quadraticCurveTo(gx + s * 0.9, gy, gx + s * 0.9, gy - s * 0.7)
  ctx.stroke()
  for (const [px, py] of [
    [gx, gy - s],
    [gx, gy + s],
    [gx + s * 0.9, gy - s * 0.7]
  ] as const) {
    ctx.beginPath()
    ctx.arc(px, py, 2.6, 0, Math.PI * 2)
    ctx.fillStyle = secondary
    ctx.fill()
    ctx.strokeStyle = primary
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  ctx.restore()
}

function drawHarnessRing(
  ctx: CanvasRenderingContext2D,
  size: number,
  hubRadius: number,
  ringProgress: number,
  clamp: number,
  spark: number,
  t: number,
  showHub: boolean
) {
  const c = size / 2
  const rOut = round(c * 0.93)
  const rIn = round(c * 0.82)
  const rMid = (rIn + rOut) / 2
  const strutOuter = rIn - 1
  const p = EASE(cl(clamp))

  const primary = resolveColor('var(--primary)')
  const secondary = resolveColor('var(--secondary)')

  ctx.save()
  ctx.globalAlpha = 0.9

  // --- Ring segments: screws rise together over the first 60% of ringProgress, then each
  // band deploys out of its screw (staggered per segment). ---
  for (const a of RING_AXIS_DEG) {
    const screwIn = cl(ringProgress / 0.6)
    if (screwIn <= 0) continue
    const deployProg = cl((ringProgress - 0.6) / 0.4)
    const idx = RING_AXIS_DEG.indexOf(a)
    const local = cl((deployProg - idx * 0.14) / 0.5)
    const span = ARC_HALF * local
    const screwScale = EASE(screwIn)
    const riseY = (1 - screwScale) * 24
    const burst = Math.sin(screwIn * Math.PI)
    const m = polar(c, c, rMid, a)

    if (span > 0.5) {
      segPath(ctx, c, c, rOut, rIn, a - span, a + span)
      ctx.fillStyle = secondary
      ctx.fill()
      ctx.strokeStyle = primary
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.stroke()

      // interior rungs — revealed as the band reaches each
      for (const d of [-22, -11, 11, 22]) {
        if (Math.abs(d) > span) continue
        const u = polar(c, c, rIn + 2, a + d)
        const v = polar(c, c, rOut - 2, a + d)
        ctx.beginPath()
        ctx.moveTo(u.x, u.y)
        ctx.lineTo(v.x, v.y)
        ctx.strokeStyle = withAlpha(primary, 0.5)
        ctx.lineWidth = 1
        ctx.stroke()
      }
      // end rivets
      for (const ang of [a - span, a + span]) {
        const q = polar(c, c, rMid, ang)
        ctx.beginPath()
        ctx.arc(q.x, q.y, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = primary
        ctx.fill()
      }
    }

    // energy burst at the screw's spot as it emerges
    if (burst > 0.01) {
      ctx.beginPath()
      ctx.arc(m.x, m.y, 6 + screwIn * 22, 0, Math.PI * 2)
      ctx.strokeStyle = withAlpha(primary, burst * 0.5)
      ctx.lineWidth = 1.5
      ctx.stroke()
      for (let k = 0; k < 6; k++) {
        const ang = ((a + k * 60) * Math.PI) / 180
        const inner = 5
        const outer = 9 + burst * 22
        const flick = 0.35 + 0.65 * Math.abs(Math.sin(screwIn * 17 + k * 1.7))
        ctx.beginPath()
        ctx.moveTo(m.x + Math.cos(ang) * inner, m.y + Math.sin(ang) * inner)
        ctx.lineTo(m.x + Math.cos(ang) * outer, m.y + Math.sin(ang) * outer)
        ctx.strokeStyle = withAlpha(primary, burst * flick)
        ctx.lineWidth = 1.5
        ctx.lineCap = 'round'
        ctx.stroke()
      }
    }

    // hexagonal screw — rises from below and stays, anchoring the segment's corner
    ctx.save()
    ctx.globalAlpha = screwIn * 0.9
    ctx.translate(m.x, m.y + riseY)
    ctx.rotate((a * Math.PI) / 180)
    ctx.scale(screwScale || 0.0001, screwScale || 0.0001)
    pathPolygon(ctx, hexPoints(20))
    ctx.fillStyle = secondary
    ctx.fill()
    ctx.strokeStyle = primary
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.stroke()
    pathPolygon(ctx, hexPoints(9.6))
    ctx.strokeStyle = withAlpha(primary, 0.7)
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-9.6, 0)
    ctx.lineTo(9.6, 0)
    ctx.strokeStyle = primary
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }

  // --- Columns: shaft + curved gripper clamp, riding inward to hug the hub. ---
  if (p > 0) {
    for (const d of RING_AXIS_DEG) {
      const rO = strutOuter
      const gripR = strutOuter - (strutOuter - hubRadius) * p
      const footLen = 15
      const rO2 = rO - footLen
      const footW = 14
      const shaftW = 9
      const pt = (r: number, w: number) => offsetPoint(polar(c, c, r, d), d, w)

      pathPolygon(ctx, [
        pt(rO, footW),
        pt(rO2, footW),
        pt(rO2, shaftW),
        pt(gripR, shaftW),
        pt(gripR, -shaftW),
        pt(rO2, -shaftW),
        pt(rO2, -footW),
        pt(rO, -footW)
      ])
      ctx.fillStyle = secondary
      ctx.fill()
      ctx.strokeStyle = primary
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      ctx.stroke()

      const GRIP = 30
      bandPath(ctx, c, c, gripR - 7, gripR + 5, d - GRIP, d + GRIP)
      ctx.fillStyle = secondary
      ctx.fill()
      ctx.strokeStyle = primary
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      ctx.stroke()

      for (const r of [rO2 - (rO2 - gripR) * 0.4, rO2 - (rO2 - gripR) * 0.72]) {
        const a1 = pt(r, shaftW)
        const b1 = pt(r, -shaftW)
        ctx.beginPath()
        ctx.moveTo(a1.x, a1.y)
        ctx.lineTo(b1.x, b1.y)
        ctx.strokeStyle = withAlpha(primary, 0.6)
        ctx.lineWidth = 1.25
        ctx.stroke()
      }
      for (const q of [pt(rO, footW), pt(rO, -footW)]) {
        ctx.beginPath()
        ctx.arc(q.x, q.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = primary
        ctx.fill()
      }

      // hook/screw snap onto the hub in the last stretch of the clamp
      const hookSnap = cl((clamp - 0.82) / 0.18)
      if (hookSnap > 0) {
        const bolt = polar(c, c, gripR - 1, d)
        const slotA = offsetPoint(bolt, d, 2.6)
        const slotB = offsetPoint(bolt, d, -2.6)
        ctx.save()
        ctx.globalAlpha = hookSnap
        for (const off of [GRIP - 7, -(GRIP - 7)]) {
          const a1 = polar(c, c, gripR + 3, d + off)
          const b1 = polar(c, c, gripR - 9, d + off * 0.55)
          ctx.beginPath()
          ctx.moveTo(a1.x, a1.y)
          ctx.lineTo(b1.x, b1.y)
          ctx.strokeStyle = primary
          ctx.lineWidth = 2.5
          ctx.lineCap = 'round'
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(bolt.x, bolt.y, 3.6, 0, Math.PI * 2)
        ctx.fillStyle = primary
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(slotA.x, slotA.y)
        ctx.lineTo(slotB.x, slotB.y)
        ctx.strokeStyle = withAlpha(secondary, 0.9)
        ctx.lineWidth = 1.25
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.restore()
      }
    }
  }

  // --- Electricity: draws across each gap in sequence, then shimmers in place. ---
  for (const deg of CONDUIT_ANGLES_DEG) {
    const idx = CONDUIT_ANGLES_DEG.indexOf(deg)
    const local = cl((spark - idx * 0.16) / 0.4)
    if (local <= 0) continue
    const half = 13
    const halfBand = (rOut - rIn) / 2
    for (const v of WAVE_VARIANTS) {
      const waveR = rMid + v.band * halfBand * 0.42
      drawWaveArc(
        ctx,
        c,
        c,
        waveR,
        deg - half,
        deg + half,
        v.samples,
        halfBand * v.amplitude,
        t * v.speed * v.dir + idx,
        v.seed + idx * 13,
        local,
        primary,
        v.width,
        v.opacity
      )
    }
  }

  // --- Hub: fades in once the clamp has mostly finished. ---
  if (showHub) drawHub(ctx, c, c, hubRadius, cl((clamp - 0.6) / 0.4))

  ctx.restore()
}

export function HarnessRing({
  size,
  hubRadius,
  ringProgress,
  clamp,
  spark,
  showHub = true,
  paused = false
}: {
  size: number // px diameter of the ring
  hubRadius: number // gripper columns' inner target — the "main" hub's radius
  ringProgress: number // 0→1 — screws rise, then bands deploy
  clamp: number // 0→1 — columns extend and clamp onto the hub
  spark: number // 0→1 — electricity draws across the gaps
  // Draw the "main" hub at the centre. The columns still clamp to `hubRadius` either way —
  // set false where the ring reads better empty (the label is illegible at small sizes).
  showHub?: boolean
  /**
   * Stops this mark's own rAF loop. The canvas keeps its last frame, so the harness stays on
   * screen as a still — for a page that stacks several marks, the ones off-screen cost
   * nothing. Mirrors `AIACanvas`'s `paused`.
   */
  paused?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef({ size, hubRadius, ringProgress, clamp, spark, showHub })
  propsRef.current = { size, hubRadius, ringProgress, clamp, spark, showHub }
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0
    let t = 0

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
      const { size: s, hubRadius: cr, ringProgress: rp, clamp: cl2, spark: sp, showHub: sh } = propsRef.current
      // `t` is the raw frame count, NOT a scaled clock. The wave phase downstream is
      // `t * v.speed * v.dir`, which is exactly Vinaya's own hero: its SVG advances
      // `times[w] += v.speed * v.dir` once per frame. Scaling `t` here (it used to be
      // `t * 0.06`) divided the electricity's speed by ~17 and it read as frozen.
      if (s > 0) drawHarnessRing(ctx, s, cr, rp, cl2, sp, t, sh)
      // Paused ⇒ STOP the loop, do not merely freeze the clock. Holding `t` still while
      // continuing to schedule frames leaves a full clearRect + redraw running at 60fps for
      // a mark nobody is looking at, which is the exact cost this prop exists to avoid.
      // The canvas keeps its last frame, so the harness stays on screen as a still.
      if (pausedRef.current) {
        raf = 0
        return
      }
      t++
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [paused])

  // Parked repaint: while the loop is stopped the mark still has to reflect changing props
  // (the reveal ramp can advance before the timeline head arrives). One frame per change.
  useEffect(() => {
    if (!paused) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
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
    if (size > 0) drawHarnessRing(ctx, size, hubRadius, ringProgress, clamp, spark, 0, showHub)
  }, [paused, size, hubRadius, ringProgress, clamp, spark, showHub])

  return <canvas ref={canvasRef} className='pointer-events-none absolute inset-0 h-full w-full' />
}
