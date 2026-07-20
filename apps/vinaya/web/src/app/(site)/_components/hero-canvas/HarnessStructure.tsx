'use client'

// The harness as an accent wireframe robot that BUILDS from nothing — pieces draw on
// sequentially (stroke draw-on via pathLength, not a fade). Ring segments one by one,
// then thick squared columns extend from the ring and clamp ONTO main (touching), with
// greeble detail (rivets, foot plates, rungs) for a spaceship/robot read. Electricity
// draws across the gaps as a wide, thick band. Slightly transparent.

import { useEffect, useRef } from 'react'
import { CONDUIT_ANGLES_DEG, offsetPoint, polar, RING_AXIS_DEG, round } from './harness-geometry'

const ARC_HALF = 33 // each ring segment spans 66°, leaving 24° gaps on the diagonals
const EASE = (t: number) => 1 - (1 - t) ** 3
const cl = (x: number) => Math.max(0, Math.min(1, x))

// Electricity — the exact layered wavy-arc tuning from Vāda's ring (aia-ring.tsx),
// just re-colored to primary. Calm, not a wild band.
const WAVE_VARIANTS = [
  { samples: 80, amplitude: 2, freq: 7, width: 1, speed: 0.1, dir: 1, opacity: 0.4 },
  { samples: 80, amplitude: 4, freq: 13, width: 2.5, speed: 0.05, dir: -1, opacity: 0.8 },
  { samples: 80, amplitude: 3.8, freq: 0.22, width: 1, speed: 0.03, dir: -1, opacity: 1 }
]

function waveArc(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  samples: number,
  amplitude: number,
  freq: number,
  timeOffset: number
): string {
  const points: string[] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const angle = startAngle + (endAngle - startAngle) * t
    const r = radius + Math.sin(i * freq + timeOffset) * amplitude
    const x = center + Math.cos(angle) * r
    const y = center + Math.sin(angle) * r
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return points.join(' ')
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
  const arcRefs = useRef<(SVGPathElement | null)[]>([])
  const timesRef = useRef<number[]>(WAVE_VARIANTS.map(() => 0))
  const rafRef = useRef(0)
  const live = spark > 0
  useEffect(() => {
    if (!live) return
    const half = (13 * Math.PI) / 180
    const animate = () => {
      for (let w = 0; w < WAVE_VARIANTS.length; w++) {
        const v = WAVE_VARIANTS[w]
        if (v) timesRef.current[w] = (timesRef.current[w] ?? 0) + v.speed * v.dir
      }
      CONDUIT_ANGLES_DEG.forEach((deg, g) => {
        const mid = (deg * Math.PI) / 180
        for (let w = 0; w < WAVE_VARIANTS.length; w++) {
          const v = WAVE_VARIANTS[w]
          const el = arcRefs.current[g * WAVE_VARIANTS.length + w]
          if (!v || !el) continue
          const breathe = 1 + 0.35 * Math.sin((timesRef.current[w] ?? 0) * 0.4 + w * 1.2)
          el.setAttribute(
            'd',
            waveArc(
              c,
              rMid,
              mid - half,
              mid + half,
              v.samples,
              v.amplitude * breathe,
              v.freq,
              (timesRef.current[w] ?? 0) + g
            )
          )
        }
      })
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [live, c, rMid])

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
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      fill='none'
      aria-hidden='true'
      className='pointer-events-none absolute inset-0'
      style={{ opacity: 0.9 }}
    >
      <defs>
        <filter id='harness-spark-glow'>
          <feGaussianBlur stdDeviation='0.7' result='b' />
          <feMerge>
            <feMergeNode in='b' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      {/* --- Ring segments: draw on one at a time, then rivet/greeble detail pops in --- */}
      {RING_AXIS_DEG.map((a, i) => {
        const local = cl((ringProgress - i * 0.24) / 0.28)
        if (local <= 0) return null
        const s0 = a - ARC_HALF
        const s1 = a + ARC_HALF
        const midArc = polar(c, c, rMid, a)
        return (
          <g key={a}>
            <path
              d={segPath(s0, s1)}
              pathLength={1}
              className='stroke-primary'
              strokeWidth={2.5}
              strokeLinejoin='round'
              strokeLinecap='round'
              style={{ strokeDasharray: 1, strokeDashoffset: 1 - local }}
            />
            {local > 0.55 && (
              <g style={{ opacity: cl((local - 0.55) / 0.45) }}>
                {/* interior rungs — segmented panel lines */}
                {[-22, -11, 0, 11, 22].map((d) => {
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
                {/* a small module box at the segment center */}
                <rect
                  x={midArc.x - 5}
                  y={midArc.y - 5}
                  width={10}
                  height={10}
                  className='stroke-primary'
                  strokeWidth={1.25}
                  transform={`rotate(${a + 90} ${midArc.x} ${midArc.y})`}
                />
                {/* rivets near the two end caps */}
                {[s0 + 4, s1 - 4].map((ang) => {
                  const q = polar(c, c, rMid, ang)
                  return <circle key={ang} cx={q.x} cy={q.y} r={1.8} className='fill-primary' />
                })}
              </g>
            )}
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
          return (
            <g key={d}>
              <path d={`${shaft} Z`} className='stroke-primary' strokeWidth={3} strokeLinejoin='round' />
              <path d={grip} className='stroke-primary' strokeWidth={3} strokeLinejoin='round' />
              {rung(rO2 - (rO2 - gripR) * 0.4)}
              {rung(rO2 - (rO2 - gripR) * 0.72)}
              <circle cx={pt(rO, footW).x} cy={pt(rO, footW).y} r={2} className='fill-primary' />
              <circle cx={pt(rO, -footW).x} cy={pt(rO, -footW).y} r={2} className='fill-primary' />
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
            className='stroke-primary'
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
    </svg>
  )
}
