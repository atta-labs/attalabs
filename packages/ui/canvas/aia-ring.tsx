'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useAIAContext } from './aia-context'
import { AIACanvas } from './aia-canvas'

// Generate a wavy arc path from startAngle to endAngle
// timeOffset shifts the wave phase, creating flowing motion when animated
function generateArcSegment(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  samples: number,
  amplitude: number,
  freq: number,
  timeOffset = 0
): string {
  const points: string[] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const angle = startAngle + (endAngle - startAngle) * t
    const wave = Math.sin(i * freq + timeOffset) * amplitude
    const r = radius + wave
    const x = center + Math.cos(angle) * r
    const y = center + Math.sin(angle) * r
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return points.join(' ')
}

// Three wave variants — layered for depth, each at its own speed and direction
// freq: spatial wave density per segment | speed: travel per frame at 60fps | dir: travel direction
const WAVE_VARIANTS = [
  { samples: 80, amplitude: 2.0, freq: 7, color: 'var(--primary)', width: 1.0, speed: 0.1, dir: 1, opacity: 0.4 },
  { samples: 80, amplitude: 4.0, freq: 13, color: 'var(--secondary)', width: 2.5, speed: 0.05, dir: -1, opacity: 0.8 },
  { samples: 80, amplitude: 3.8, freq: 0.22, color: 'var(--accent)', width: 1.0, speed: 0.03, dir: -1, opacity: 1 }
]

interface AIARingProps {
  size?: number
  orbit: React.ReactNode[]
  children?: React.ReactNode
  activeStep?: number
  thinking?: boolean
  sphereRadius?: number
  matrixOpacity?: number
  solidBg?: boolean
  bgColor?: string
  bgOpacity?: number
}

function AIARingInner({
  size = 600,
  orbit,
  children,
  activeStep = 0,
  thinking = false,
  sphereRadius = 50,
  matrixOpacity,
  solidBg = false,
  bgColor,
  bgOpacity
}: AIARingProps) {
  const ctx = useAIAContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const numSpheres = orbit.length
  const thinkingRef = useRef(thinking)
  thinkingRef.current = thinking

  const center = size / 2
  const radius = size / 2

  // Approximate arc length for one segment — used for strokeDasharray draw-in
  const segmentLength = ((2 * Math.PI * radius) / numSpheres) * 1.08

  // SVG clipPath that excludes sphere positions using even-odd fill rule
  // Outer rect - sphere circles = wave renders everywhere except sphere zones
  const waveClipPath = useMemo(() => {
    const outer = `M -${size * 2} -${size * 2} H ${size * 3} V ${size * 3} H -${size * 2} Z`
    const holes = Array.from({ length: numSpheres }, (_, i) => {
      const angle = (i / numSpheres) * Math.PI * 2 - Math.PI / 2
      const cx = center + Math.cos(angle) * radius
      const cy = center + Math.sin(angle) * radius
      const r = sphereRadius
      return `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z`
    }).join(' ')
    return `${outer} ${holes}`
  }, [size, numSpheres, center, radius, sphereRadius])

  // Flat ref array for all SVG path elements [seg * WAVE_VARIANTS.length + waveIndex]
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  // Independent time accumulator per wave variant — allows each to travel at its own speed
  const timesRef = useRef<number[]>(WAVE_VARIANTS.map(() => 0))
  const rafRef = useRef<number>(0)

  // Register ring center/radius with canvas context
  useEffect(() => {
    const el = containerRef.current
    if (!el || !ctx) return

    const register = () => {
      const rect = el.getBoundingClientRect()
      ctx.registerRing({
        id: 'main-ring',
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        radius: size / 2,
        style: 'none',
        spherePositions: [],
        sphereCount: numSpheres,
        thinking: thinkingRef.current,
        matrixOpacity,
        bgOpacity
      })
    }

    register()
    window.addEventListener('resize', register)
    return () => {
      window.removeEventListener('resize', register)
      ctx.unregisterRing('main-ring')
    }
  }, [size, ctx, numSpheres])

  // Sync thinking state without unregister/re-register
  useEffect(() => {
    if (!ctx) return
    ctx.updateRing('main-ring', { thinking })
  }, [ctx, thinking])

  // Animate wave paths — drives wave motion by updating SVG path `d` attributes directly
  // This bypasses React re-renders for maximum performance
  useEffect(() => {
    const animate = () => {
      // Advance each variant's time independently
      for (let w = 0; w < WAVE_VARIANTS.length; w++) {
        const v = WAVE_VARIANTS[w]!
        timesRef.current[w] = (timesRef.current[w] ?? 0) + v.speed * v.dir
      }

      for (let seg = 0; seg < numSpheres; seg++) {
        const startAngle = (seg / numSpheres) * 2 * Math.PI - Math.PI / 2
        const endAngle = ((seg + 1) / numSpheres) * 2 * Math.PI - Math.PI / 2
        // Phase offset per segment — makes the wave travel around the ring
        const segPhase = (seg / numSpheres) * Math.PI * 3

        for (let w = 0; w < WAVE_VARIANTS.length; w++) {
          const v = WAVE_VARIANTS[w]!
          const t = (timesRef.current[w] ?? 0) + segPhase
          // Amplitude breathes slowly — each variant on a different breath cycle
          const breathe = 1 + 0.35 * Math.sin((timesRef.current[w] ?? 0) * 0.4 + w * 1.2)
          const pathEl = pathRefs.current[seg * WAVE_VARIANTS.length + w]
          if (pathEl) {
            pathEl.setAttribute(
              'd',
              generateArcSegment(center, radius, startAngle, endAngle, v.samples, v.amplitude * breathe, v.freq, t)
            )
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [numSpheres, center, radius])

  return (
    <div ref={containerRef} className='relative' style={{ width: size, height: size }}>
      {solidBg && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: bgColor ?? 'var(--background)',
            zIndex: 0
          }}
        />
      )}
      <svg
        className='absolute inset-0 pointer-events-none z-10'
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id='aia-wave-glow'>
            <feGaussianBlur stdDeviation='0.6' result='blur' />
            <feMerge>
              <feMergeNode in='blur' />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
          <clipPath id='aia-ring-wave-clip'>
            <path d={waveClipPath} fillRule='evenodd' clipRule='evenodd' />
          </clipPath>
        </defs>

        {/* Wave paths clipped to exclude sphere zones — no opaque covers needed */}
        <g clipPath='url(#aia-ring-wave-clip)'>
          {Array.from({ length: numSpheres }).map((_, segIndex) => {
            const revealed = activeStep > segIndex
            return WAVE_VARIANTS.map((v, waveIndex) => (
              <path
                key={`seg-${segIndex}-w${waveIndex}`}
                ref={(el) => {
                  pathRefs.current[segIndex * WAVE_VARIANTS.length + waveIndex] = el
                }}
                d=''
                fill='none'
                strokeLinecap='round'
                style={{
                  stroke: v.color,
                  strokeWidth: v.width,
                  filter: 'url(#aia-wave-glow)',
                  opacity: revealed ? v.opacity : 0,
                  strokeDasharray: segmentLength,
                  strokeDashoffset: revealed ? 0 : segmentLength,
                  transition: 'stroke-dashoffset 1200ms ease-in-out, opacity 400ms ease-in'
                }}
              />
            ))
          })}
        </g>
      </svg>

      <div className='absolute inset-0 flex items-center justify-center z-20'>{children}</div>

      {orbit.map((sphere, i) => {
        const angle = (i / numSpheres) * Math.PI * 2 - Math.PI / 2
        const x = 50 + Math.cos(angle) * 50
        const y = 50 + Math.sin(angle) * 50
        return (
          <div
            key={i}
            className='absolute z-30'
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {sphere}
          </div>
        )
      })}
    </div>
  )
}

export function AIARing(props: Parameters<typeof AIARingInner>[0]) {
  const ctx = useAIAContext()

  if (ctx) return <AIARingInner {...props} />

  return (
    <AIACanvas wanderDuration={0} alwaysRenderSpheres>
      <AIARingInner {...props} />
    </AIACanvas>
  )
}
