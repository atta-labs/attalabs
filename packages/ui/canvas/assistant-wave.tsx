'use client'

import { useEffect, useRef } from 'react'
import { harmonicWave } from './shared/math'

const PRIMARY = 'var(--primary, #7B5CFA)'
const SECONDARY = 'var(--secondary, #3B82F6)'
const ACCENT = 'var(--accent, #06B6D4)'

const COLORS = [PRIMARY, SECONDARY, ACCENT, PRIMARY, SECONDARY]

const POINTS = 128

const WAVE_CONFIGS = [
  { amplitude: 42, frequency: 1.8, speed: 0.025, phase: 0, opacity: 0.95 },
  { amplitude: 34, frequency: 2.2, speed: 0.03, phase: 1.2, opacity: 0.8 },
  { amplitude: 50, frequency: 1.4, speed: 0.02, phase: 2.5, opacity: 0.7 },
  { amplitude: 28, frequency: 2.8, speed: 0.035, phase: 3.8, opacity: 0.6 },
  { amplitude: 38, frequency: 1.6, speed: 0.028, phase: 5.0, opacity: 0.5 }
]

function buildPath(config: (typeof WAVE_CONFIGS)[number], time: number, w: number, h: number) {
  const { amplitude, frequency, speed, phase } = config
  const t = time * speed
  const cy = h / 2

  let d = `M 0 ${cy}`
  for (let i = 0; i <= POINTS; i++) {
    const x = (i / POINTS) * w
    const normX = i / POINTS
    const envelope = Math.exp(-(((normX - 0.5) * 3.2) ** 2))
    const scaledAmp = (amplitude / 240) * h
    const y = cy + envelope * scaledAmp * harmonicWave(normX, frequency, t, phase)
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return d
}

function seeded(i: number) {
  const x = Math.sin(i * 9301 + 49297) * 49297
  return x - Math.floor(x)
}
const r2 = (n: number) => Math.round(n * 100) / 100

interface AssistantWaveProps {
  width?: number
  height?: number
  opacity?: number
  showParticles?: boolean
  label?: string
  className?: string
}

export function AssistantWave({
  width = 500,
  height = 240,
  opacity = 1,
  showParticles = true,
  label,
  className
}: AssistantWaveProps) {
  const frameRef = useRef(0)
  const pathRefs = useRef<(SVGPathElement | null)[]>([])

  useEffect(() => {
    let running = true
    let t = 0
    const tick = () => {
      if (!running) return
      t += 1
      pathRefs.current.forEach((el, i) => {
        const config = WAVE_CONFIGS[i]
        if (el && config) el.setAttribute('d', buildPath(config, t, width, height))
      })
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(frameRef.current)
    }
  }, [width, height])

  const dots = showParticles
    ? Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: r2(width / 2 + Math.cos((i / 18) * Math.PI * 2) * (width * 0.24 + seeded(i) * (width * 0.14))),
        y: r2(height / 2 + Math.sin((i / 18) * Math.PI * 2) * (height * 0.25 + seeded(i + 100) * (height * 0.12))),
        size: r2(2 + seeded(i + 200) * 3),
        delay: r2(i * 0.2),
        duration: r2(3.5 + seeded(i + 300) * 2.5),
        color: COLORS[i % COLORS.length]!
      }))
    : []

  return (
    <div className={`relative select-none ${className ?? ''}`} style={{ width, height, opacity }}>
      {label && (
        <div className='absolute inset-x-0 -top-8 text-center'>
          <span className='text-lg text-primary tracking-wide'>{label}</span>
        </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className='overflow-visible'>
        <defs>
          <filter id='wave-blur' x='-20%' y='-20%' width='140%' height='140%'>
            <feGaussianBlur stdDeviation='5' result='b' />
            <feMerge>
              <feMergeNode in='b' />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>

          <linearGradient id='wg-0' x1='0' x2='1' y1='0' y2='0'>
            <stop offset='0%' stopColor={PRIMARY} stopOpacity='0' />
            <stop offset='20%' stopColor={PRIMARY} stopOpacity='1' />
            <stop offset='50%' stopColor={SECONDARY} stopOpacity='1' />
            <stop offset='80%' stopColor={ACCENT} stopOpacity='1' />
            <stop offset='100%' stopColor={ACCENT} stopOpacity='0' />
          </linearGradient>
          <linearGradient id='wg-1' x1='0' x2='1' y1='0' y2='0'>
            <stop offset='0%' stopColor={SECONDARY} stopOpacity='0' />
            <stop offset='25%' stopColor={SECONDARY} stopOpacity='1' />
            <stop offset='50%' stopColor={ACCENT} stopOpacity='1' />
            <stop offset='75%' stopColor={PRIMARY} stopOpacity='1' />
            <stop offset='100%' stopColor={PRIMARY} stopOpacity='0' />
          </linearGradient>
          <linearGradient id='wg-2' x1='0' x2='1' y1='0' y2='0'>
            <stop offset='0%' stopColor={ACCENT} stopOpacity='0' />
            <stop offset='20%' stopColor={ACCENT} stopOpacity='1' />
            <stop offset='50%' stopColor={PRIMARY} stopOpacity='1' />
            <stop offset='80%' stopColor={SECONDARY} stopOpacity='1' />
            <stop offset='100%' stopColor={SECONDARY} stopOpacity='0' />
          </linearGradient>
          <linearGradient id='wg-3' x1='0' x2='1' y1='0' y2='0'>
            <stop offset='0%' stopColor={PRIMARY} stopOpacity='0' />
            <stop offset='25%' stopColor={PRIMARY} stopOpacity='1' />
            <stop offset='50%' stopColor={ACCENT} stopOpacity='1' />
            <stop offset='75%' stopColor={SECONDARY} stopOpacity='1' />
            <stop offset='100%' stopColor={SECONDARY} stopOpacity='0' />
          </linearGradient>
          <linearGradient id='wg-4' x1='0' x2='1' y1='0' y2='0'>
            <stop offset='0%' stopColor={ACCENT} stopOpacity='0' />
            <stop offset='20%' stopColor={ACCENT} stopOpacity='1' />
            <stop offset='50%' stopColor={SECONDARY} stopOpacity='1' />
            <stop offset='80%' stopColor={PRIMARY} stopOpacity='1' />
            <stop offset='100%' stopColor={PRIMARY} stopOpacity='0' />
          </linearGradient>
        </defs>

        {WAVE_CONFIGS.map((cfg, i) => (
          <path
            key={i}
            ref={(el) => {
              pathRefs.current[i] = el
            }}
            d={buildPath(cfg, 0, width, height)}
            fill='none'
            stroke={`url(#wg-${i})`}
            strokeWidth={3.5 - i * 0.3}
            strokeLinecap='round'
            opacity={cfg.opacity}
            filter='url(#wave-blur)'
          />
        ))}
      </svg>

      {showParticles && (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className='absolute top-0 left-0 pointer-events-none overflow-visible'
        >
          <defs>
            <filter id='particle-glow' x='-100%' y='-100%' width='300%' height='300%'>
              <feGaussianBlur stdDeviation='3' />
            </filter>
          </defs>
          {dots.map((d) => (
            <circle
              key={d.id}
              cx={d.x}
              cy={d.y}
              r={d.size}
              fill={d.color}
              filter='url(#particle-glow)'
              className='animate-particle'
              style={{
                animationDelay: `${d.delay}s`,
                animationDuration: `${d.duration}s`
              }}
            />
          ))}
          <style>{`
            @keyframes particle-pulse {
              0%, 100% { opacity: 0; transform: scale(0.4); }
              50% { opacity: 0.7; transform: scale(1.2); }
            }
            .animate-particle {
              animation: particle-pulse ease-in-out infinite;
              transform-origin: center;
              transform-box: fill-box;
            }
          `}</style>
        </svg>
      )}
    </div>
  )
}
