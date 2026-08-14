'use client'

// The harness as an accent wireframe robot that BUILDS from nothing — pieces draw on
// sequentially (stroke draw-on via pathLength, not a fade). Ring segments one by one,
// then thick squared columns extend from the ring and clamp ONTO main (touching), with
// greeble detail (rivets, foot plates, rungs) for a spaceship/robot read. Electricity
// draws across the gaps as a wide, thick band. Slightly transparent.

import { useEffect, useRef } from 'react'
import { CONDUIT_ANGLES_DEG, offsetPoint, polar, RING_AXIS_DEG, round } from './harness-geometry'

// Two bolts per conduit — both primary ink so both waves are clearly visible (an accent
// companion could vanish depending on the theme). Two irregular lines read as lightning;
// five parallel thin ones read as a fuzzy rope.
const STROKE_BY_LAYER = ['stroke-primary', 'stroke-primary']

const ARC_HALF = 33 // each ring segment spans 66°, leaving 24° gaps on the diagonals
const EASE = (t: number) => 1 - (1 - t) ** 3
const cl = (x: number) => Math.max(0, Math.min(1, x))

// Deterministic pseudo-random 0..1 from an int — per-vertex seeds so each jag sits at its
// own height/spacing (irregular bolt, not a clean sine).
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// A flat-topped hexagon of radius `r` centered at the origin, as an SVG points string.
function hex(r: number): string {
  const pts: string[] = []
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

// Electricity — a jagged lightning arc, not a smooth band. Two bolts per conduit: a bold
// primary core and a thinner accent companion (branch). Each is a low-vertex angular
// polyline whose jags shimmer in place (fast, irregular) instead of a sine crawling around
// the ring. `amplitude` is the fraction of the ring band's half-thickness the jags swing
// across; `speed` is the shimmer rate; `seed` offsets the per-vertex randomness so the two
// bolts never overlap.
// `band` offsets each wave to its own depth in the ring channel (−1 inner, +1 outer) so the
// two waves stay distinct instead of overlapping on the centerline.
const WAVE_VARIANTS = [
  { samples: 22, amplitude: 0.6, width: 1.6, speed: 0.09, dir: 1, opacity: 0.9, seed: 0, band: -1 },
  { samples: 20, amplitude: 0.55, width: 1.2, speed: 0.12, dir: -1, opacity: 0.68, seed: 40, band: 1 }
]

// Cursor magnetic pull: EVERY conduit whose midpoint is within PULL_RANGE of the cursor
// bulges toward the pointer, strength ∝ proximity (several pulled at once, not just one).
// Endpoints stay anchored so a bolt never breaks.
const MAX_PULL = 30
const PULL_RANGE = 265

// Catmull-Rom → cubic bezier: round the polyline's corners so the jags read as waves
// instead of sharp triangles. Endpoints are duplicated so the anchors stay put.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const first = pts[0]!
  const d = [`M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d.push(
      `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
    )
  }
  return d.join(' ')
}

function waveArc(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  samples: number,
  amplitudePx: number,
  time: number,
  seed: number,
  pullX = 0,
  pullY = 0
): string {
  const points: { x: number; y: number }[] = []
  const span = endAngle - startAngle
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    // envelope: 0 at both ends, 1 at the middle — the bolt is anchored to the ring at each
    // end and jags hardest across the gap.
    const env = Math.sin(t * Math.PI)
    // Two incommensurate terms with per-vertex random phase — an irregular waveform. Both
    // time terms subtract (same direction) so the whole pattern GLIDES along the arc from
    // one end to the other (a traveling wave), rather than shimmering in place.
    const h1 = hash01(i + seed)
    const h2 = hash01(i + seed + 97)
    // Low-frequency crest rolls the whole wave along the arc; a higher-frequency term adds
    // irregular electric texture. Both subtract `time` → one clear travel direction.
    const off = Math.sin(i * 1.5 - time + h1 * 6.283) * 0.62 + Math.sin(i * 5.3 - time * 1.9 + h2 * 6.283) * 0.38
    const r = radius + off * amplitudePx * env
    // horizontal jitter — nudge each sample's angle so the jags aren't evenly spaced.
    const angJit = (hash01(i + seed + 50) - 0.5) * span * 0.07
    const angle = startAngle + span * t + angJit
    // bump peaks mid-arc → the bolt leans toward the cursor without detaching from the ring.
    const x = center + Math.cos(angle) * r + pullX * env
    const y = center + Math.sin(angle) * r + pullY * env
    points.push({ x, y })
  }
  return smoothPath(points)
}

// Forked branches the electricity throws toward the cursor, per active conduit: one from the
// centre of the stream, two offset a few px along the stream in each direction.
const BRANCHES_PER_CONDUIT = 3

// A jagged lightning bolt from (sx,sy) to (ex,ey): angular segments with a random offset that
// peaks mid-span and is 0 at both ends — so it stays welded to the arc and touches the cursor.
// `seed` varies per frame to make it crackle.
function boltPath(sx: number, sy: number, ex: number, ey: number, segs: number, jag: number, seed: number): string {
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len // unit perpendicular
  const ny = dx / len
  const pts: string[] = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const env = Math.sin(t * Math.PI)
    const off = (hash01(i * 2.3 + seed) - 0.5) * jag * env + (hash01(i * 7.1 + seed * 1.7) - 0.5) * jag * 0.4 * env
    const x = sx + dx * t + nx * off
    const y = sy + dy * t + ny * off
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

export function HarnessStructure({
  size,
  coreRadius,
  ringProgress,
  clamp,
  spark
}: {
  size: number
  coreRadius: number
  ringProgress: number // 0→1 draws the four ring segments in sequence
  clamp: number // 0→1 extends the columns from the ring to clamp main
  spark: number // 0→1 draws the electricity across the gaps in sequence
}) {
  const c = size / 2
  const rOut = round(c * 0.93)
  const rIn = round(c * 0.82)
  const rMid = (rIn + rOut) / 2
  const p = EASE(cl(clamp))

  const strutOuter = rIn - 1

  // Electricity wave animation — updates path `d` directly via refs (no re-render).
  const svgRef = useRef<SVGSVGElement | null>(null)
  const arcRefs = useRef<(SVGPathElement | null)[]>([])
  const timesRef = useRef<number[]>(WAVE_VARIANTS.map(() => 0))
  const rafRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0, active: false })
  const branchRefs = useRef<(SVGPathElement | null)[]>([])
  const frameRef = useRef(0)
  const live = spark > 0

  // Track the cursor in the SVG's own coordinate space (viewBox = size).
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const svg = svgRef.current
      if (!svg) return
      const r = svg.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      mouseRef.current = {
        x: ((e.clientX - r.left) / r.width) * size,
        y: ((e.clientY - r.top) / r.height) * size,
        active: true
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [size])

  useEffect(() => {
    if (!live) return
    const half = (13 * Math.PI) / 180
    const animate = () => {
      for (let w = 0; w < WAVE_VARIANTS.length; w++) {
        const v = WAVE_VARIANTS[w]
        if (v) timesRef.current[w] = (timesRef.current[w] ?? 0) + v.speed * v.dir
      }

      const mouse = mouseRef.current
      frameRef.current += 1
      const frame = frameRef.current
      // Cursor inside the harness metal → attraction off; soft ramp back on just outside rOut,
      // mirroring how it drops off past PULL_RANGE.
      const distC = Math.hypot(mouse.x - c, mouse.y - c)
      const innerFade = Math.max(0, Math.min(1, (distC - rOut) / 34))
      // jags swing across the ring band's thickness; both bolts ride its centerline.
      const halfBand = (rOut - rIn) / 2
      CONDUIT_ANGLES_DEG.forEach((deg, g) => {
        const mid = (deg * Math.PI) / 180
        // radius pull: this conduit's midpoint vs the cursor — every conduit within
        // PULL_RANGE bulges toward the pointer, strength ∝ proximity.
        let px = 0
        let py = 0
        let strength = 0
        if (mouse.active) {
          const mx = c + Math.cos(mid) * rMid
          const my = c + Math.sin(mid) * rMid
          const dx = mouse.x - mx
          const dy = mouse.y - my
          const dist = Math.hypot(dx, dy) || 1
          if (dist < PULL_RANGE) {
            strength = (1 - dist / PULL_RANGE) * innerFade
            px = (dx / dist) * strength * MAX_PULL
            py = (dy / dist) * strength * MAX_PULL
          }
        }
        for (let w = 0; w < WAVE_VARIANTS.length; w++) {
          const v = WAVE_VARIANTS[w]
          const el = arcRefs.current[g * WAVE_VARIANTS.length + w]
          if (!v || !el) continue
          // each wave rides its own depth in the band so the two stay separate
          const waveR = rMid + v.band * halfBand * 0.42
          el.setAttribute(
            'd',
            waveArc(
              c,
              waveR,
              mid - half,
              mid + half,
              v.samples,
              halfBand * v.amplitude,
              (timesRef.current[w] ?? 0) + g,
              v.seed + g * 13,
              px,
              py
            )
          )
        }

        // Branching lightning: when this conduit is near the cursor, the electricity FORKS —
        // jagged bolts peel off the arc apex and reach out to the pointer, crackling.
        const apexX = c + Math.cos(mid) * rMid + px
        const apexY = c + Math.sin(mid) * rMid + py
        const tanX = -Math.sin(mid) // arc tangent = the direction the electricity stream runs
        const tanY = Math.cos(mid)
        const soft = strength * strength // squared → only really shows once the cursor is near
        for (let b = 0; b < BRANCHES_PER_CONDUIT; b++) {
          const bel = branchRefs.current[g * BRANCHES_PER_CONDUIT + b]
          if (!bel) continue
          if (strength <= 0.02 || !mouse.active) {
            bel.setAttribute('opacity', '0')
            continue
          }
          // b0 from the stream centre; b1/b2 offset along the stream either way
          const offset = b === 0 ? 0 : b === 1 ? 18 : -18
          const ox = apexX + tanX * offset
          const oy = apexY + tanY * offset
          const len = Math.hypot(mouse.x - ox, mouse.y - oy)
          const segs = Math.max(6, Math.round(len / 20))
          const jag = Math.min(len * 0.16, 34)
          bel.setAttribute('d', boltPath(ox, oy, mouse.x, mouse.y, segs, jag, frame * 0.11 + g * 3 + b * 17))
          bel.setAttribute('opacity', (soft * (b === 0 ? 0.5 : 0.3)).toFixed(2))
        }
      })

      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [live, c, rMid, rIn, rOut])

  // One ring segment outline (outer arc + caps + inner arc), drawn on via a dash.
  const segPath = (s0: number, s1: number) => {
    const o0 = polar(c, c, rOut, s0)
    const o1 = polar(c, c, rOut, s1)
    const i1 = polar(c, c, rIn, s1)
    const i0 = polar(c, c, rIn, s0)
    return `M ${o0.x} ${o0.y} A ${rOut} ${rOut} 0 0 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${rIn} ${rIn} 0 0 0 ${i0.x} ${i0.y} Z`
  }

  // A curved metal band (outer arc + caps + inner arc) — used for the gripper clamps
  // that wrap main.
  const bandPath = (ri: number, ro: number, a0: number, a1: number) => {
    const o0 = polar(c, c, ro, a0)
    const o1 = polar(c, c, ro, a1)
    const i1 = polar(c, c, ri, a1)
    const i0 = polar(c, c, ri, a0)
    const large = a1 - a0 > 180 ? 1 : 0
    return `M ${o0.x} ${o0.y} A ${round(ro)} ${round(ro)} 0 ${large} 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${round(ri)} ${round(ri)} 0 ${large} 0 ${i0.x} ${i0.y} Z`
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      fill='none'
      aria-hidden='true'
      className='pointer-events-none absolute inset-0 overflow-visible'
      style={{ opacity: 0.9 }}
    >
      <defs>
        <filter id='harness-spark-glow'>
          <feGaussianBlur stdDeviation='1.1' result='b' />
          <feMerge>
            <feMergeNode in='b' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      {/* --- Ring segments: first the 4 hexagonal metal SCREWS rise from the fabric in
          unison (no per-segment stagger), then each ring band DEPLOYS out of its screw —
          the band extends both arms, rungs building as it passes them. --- */}
      {RING_AXIS_DEG.map((a, i) => {
        // all 4 screws arise together, slowly, over the first 60% of the ring ramp —
        // a long, visible grow-with-sparks emergence before anything deploys.
        const screwIn = cl(ringProgress / 0.6)
        if (screwIn <= 0) return null
        // only once the screws are up does the band deploy, staggered per segment.
        // the screws STAY — they anchor each ring segment's corner.
        const deployProg = cl((ringProgress - 0.6) / 0.4)
        const local = cl((deployProg - i * 0.14) / 0.5)
        const span = ARC_HALF * local // band grows outward from the screw
        const screwScale = EASE(screwIn) // ease the rise so it settles rather than snaps
        const riseY = (1 - screwScale) * 24 // starts 24px below, rises up out of the fabric
        const burst = Math.sin(screwIn * Math.PI) // energy 0→1→0, peaks mid-emergence
        const m = polar(c, c, rMid, a)
        return (
          <g key={a}>
            {span > 0.5 && (
              <g>
                {/* band extends symmetrically from the screw out to ±ARC_HALF */}
                <path
                  d={segPath(a - span, a + span)}
                  className='fill-secondary stroke-primary'
                  strokeWidth={2.5}
                  strokeLinejoin='round'
                  strokeLinecap='round'
                />
                {/* interior rungs — revealed as the band reaches each */}
                {[-22, -11, 11, 22]
                  .filter((d) => Math.abs(d) <= span)
                  .map((d) => {
                    const u = polar(c, c, rIn + 2, a + d)
                    const v = polar(c, c, rOut - 2, a + d)
                    return (
                      <line
                        key={d}
                        x1={u.x}
                        y1={u.y}
                        x2={v.x}
                        y2={v.y}
                        className='stroke-primary'
                        strokeWidth={1}
                        opacity={0.5}
                      />
                    )
                  })}
                {/* end rivets ride the growing ends */}
                {[a - span, a + span].map((ang, k) => {
                  const q = polar(c, c, rMid, ang)
                  return <circle key={k} cx={q.x} cy={q.y} r={1.8} className='fill-primary' />
                })}
              </g>
            )}
            {/* energy burst — the fabric sparks at each screw's spot as it emerges:
                an expanding ring + flickering radial sparks, peaking mid-rise, gone once
                settled. Drawn behind the screw so the metal rises out of its own energy. */}
            {burst > 0.01 && (
              <g transform={`translate(${m.x} ${m.y})`} filter='url(#harness-spark-glow)'>
                <circle
                  r={round(6 + screwIn * 22)}
                  className='fill-none stroke-primary'
                  strokeWidth={1.5}
                  opacity={round(burst * 0.5)}
                />
                {[0, 1, 2, 3, 4, 5].map((k) => {
                  const ang = ((a + k * 60) * Math.PI) / 180
                  const inner = 5
                  const outer = 9 + burst * 22
                  const flick = 0.35 + 0.65 * Math.abs(Math.sin(screwIn * 17 + k * 1.7))
                  return (
                    <line
                      key={k}
                      x1={round(Math.cos(ang) * inner)}
                      y1={round(Math.sin(ang) * inner)}
                      x2={round(Math.cos(ang) * outer)}
                      y2={round(Math.sin(ang) * outer)}
                      className='stroke-primary'
                      strokeWidth={1.5}
                      strokeLinecap='round'
                      opacity={round(burst * flick)}
                    />
                  )
                })}
              </g>
            )}
            {/* the hexagonal metal screw — rises from below the fabric and stays. Drawn
                LAST so the deployed band never covers it: the screw is always visible,
                anchoring the segment's corner. Screen-vertical rise sits OUTSIDE the
                rotate() so it reads as coming up through the mesh. */}
            <g transform={`translate(${m.x} ${m.y + riseY})`} style={{ opacity: screwIn }}>
              <g transform={`rotate(${a}) scale(${screwScale})`}>
                <polygon
                  points={hex(20)}
                  className='fill-secondary stroke-primary'
                  strokeWidth={2.5}
                  strokeLinejoin='round'
                />
                <polygon points={hex(9.6)} className='fill-none stroke-primary' strokeWidth={1.5} opacity={0.7} />
                {/* screw slot */}
                <line x1={-9.6} y1={0} x2={9.6} y2={0} className='stroke-primary' strokeWidth={2} />
              </g>
            </g>
          </g>
        )
      })}

      {/* --- Columns: each is a thick shaft from the ring that ends in a CURVED GRIPPER
          clamping around main's circumference — a metal collar that holds the sphere,
          not a strut poking it. The gripper rides inward to hug main as it deploys. --- */}
      {p > 0 &&
        RING_AXIS_DEG.map((d) => {
          const rO = strutOuter // ring foot
          const gripR = strutOuter - (strutOuter - (coreRadius + 8)) * p // gripper center radius
          const footLen = 15
          const rO2 = rO - footLen
          const footW = 14
          const shaftW = 9
          const pt = (r: number, w: number) => offsetPoint(polar(c, c, r, d), d, w)
          // Shaft: ring foot → the gripper's back.
          const shaft = [
            pt(rO, footW),
            pt(rO2, footW),
            pt(rO2, shaftW),
            pt(gripR, shaftW),
            pt(gripR, -shaftW),
            pt(rO2, -shaftW),
            pt(rO2, -footW),
            pt(rO, -footW)
          ]
            .map((q, k) => `${k === 0 ? 'M' : 'L'} ${q.x} ${q.y}`)
            .join(' ')
          // Gripper: a thick curved clamp wrapping main's edge, ±GRIP° around the axis.
          const GRIP = 30
          const grip = bandPath(gripR - 7, gripR + 5, d - GRIP, d + GRIP)
          const rung = (r: number) => {
            const a = pt(r, shaftW)
            const b = pt(r, -shaftW)
            return (
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className='stroke-primary' strokeWidth={1.25} opacity={0.6} />
            )
          }
          // Hook/screw that snaps onto main in the last stretch of the clamp — the moment
          // the harness LATCHES. `hookSnap` scales it in at the very end of the grip.
          const hookSnap = cl((clamp - 0.82) / 0.18)
          const bolt = polar(c, c, gripR - 1, d)
          const slotA = offsetPoint(bolt, d, 2.6)
          const slotB = offsetPoint(bolt, d, -2.6)
          return (
            <g key={d}>
              <path d={`${shaft} Z`} className='fill-secondary stroke-primary' strokeWidth={3} strokeLinejoin='round' />
              <path d={grip} className='fill-secondary stroke-primary' strokeWidth={3} strokeLinejoin='round' />
              {rung(rO2 - (rO2 - gripR) * 0.4)}
              {rung(rO2 - (rO2 - gripR) * 0.72)}
              <circle cx={pt(rO, footW).x} cy={pt(rO, footW).y} r={2} className='fill-primary' />
              <circle cx={pt(rO, -footW).x} cy={pt(rO, -footW).y} r={2} className='fill-primary' />
              {hookSnap > 0 && (
                <g style={{ opacity: hookSnap }}>
                  {/* two claw hooks biting inward from the gripper ends toward main */}
                  {[GRIP - 7, -(GRIP - 7)].map((off, k) => {
                    const a = polar(c, c, gripR + 3, d + off)
                    const b = polar(c, c, gripR - 9, d + off * 0.55)
                    return (
                      <line
                        key={k}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        className='stroke-primary'
                        strokeWidth={2.5}
                        strokeLinecap='round'
                      />
                    )
                  })}
                  {/* a bolt/screw at the clamp center — the fastener */}
                  <circle cx={bolt.x} cy={bolt.y} r={3.6} className='fill-primary stroke-primary' strokeWidth={1} />
                  <line
                    x1={slotA.x}
                    y1={slotA.y}
                    x2={slotB.x}
                    y2={slotB.y}
                    className='stroke-secondary'
                    strokeWidth={1.25}
                    strokeLinecap='round'
                  />
                </g>
              )}
            </g>
          )
        })}

      {/* --- Electricity: wide current draws across each gap in sequence, then waves --- */}
      {CONDUIT_ANGLES_DEG.map((deg, g) => {
        const local = cl((spark - g * 0.16) / 0.4)
        return WAVE_VARIANTS.map((v, w) => (
          <path
            key={`spark-${deg}-${w}`}
            ref={(el) => {
              arcRefs.current[g * WAVE_VARIANTS.length + w] = el
            }}
            d=''
            fill='none'
            pathLength={1}
            strokeLinecap='round'
            className={STROKE_BY_LAYER[w % STROKE_BY_LAYER.length]}
            style={{
              strokeWidth: v.width,
              filter: 'url(#harness-spark-glow)',
              opacity: v.opacity,
              strokeDasharray: 1,
              strokeDashoffset: 1 - local
            }}
          />
        ))
      })}

      {/* --- Branching lightning to the cursor: `d`/opacity set per frame in the loop --- */}
      {CONDUIT_ANGLES_DEG.map((deg, g) =>
        Array.from({ length: BRANCHES_PER_CONDUIT }).map((_, b) => (
          <path
            key={`branch-${deg}-${b}`}
            ref={(el) => {
              branchRefs.current[g * BRANCHES_PER_CONDUIT + b] = el
            }}
            d=''
            fill='none'
            opacity={0}
            strokeLinecap='round'
            strokeLinejoin='round'
            className='stroke-primary'
            style={{ strokeWidth: b === 0 ? 0.9 : 0.6, filter: 'url(#harness-spark-glow)' }}
          />
        ))
      )}
    </svg>
  )
}
