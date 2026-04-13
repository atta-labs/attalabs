'use client'

import { useEffect, useId, useRef } from 'react'

interface WaveConnectorProps {
  fromColor: string
  toColor: string
  height?: number
}

const WAVE_LAYERS = [
  { amplitude: 1, freq: 0.3, speed: 0.03, width: 0.2, opacity: 0.5 },
  { amplitude: 3, freq: 0.1, speed: -0.02, width: 1.0, opacity: 0.35 },
  { amplitude: 2, freq: 0.05, speed: 0.5, width: 0.05, opacity: 0.25 }
]

function buildVerticalWave(
  height: number,
  amplitude: number,
  freq: number,
  timeOffset: number,
  centerX: number
): string {
  const points: string[] = []
  const steps = 60
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = t * height
    const x = centerX + Math.sin(t * Math.PI * 2 * (height * freq) + timeOffset) * amplitude
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return points.join(' ')
}

export function WaveConnector({ fromColor, toColor, height = 40 }: WaveConnectorProps) {
  const instanceId = useId()
  const gradId = `wc-${instanceId.replace(/:/g, '')}`
  const filterId = `wc-glow-${instanceId.replace(/:/g, '')}`
  const pathRefs = useRef<(SVGPathElement | null)[]>([])
  const timeRef = useRef(Math.random() * 100)
  const rafRef = useRef(0)
  const svgWidth = 24
  const centerX = svgWidth / 2

  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.016
      for (let i = 0; i < WAVE_LAYERS.length; i++) {
        const layer = WAVE_LAYERS[i]!
        const path = pathRefs.current[i]
        if (path) {
          const t = timeRef.current * layer.speed * 60
          path.setAttribute('d', buildVerticalWave(height, layer.amplitude, layer.freq, t, centerX))
        }
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [height, centerX])

  return (
    <svg
      width={svgWidth}
      height={height}
      viewBox={`0 0 ${svgWidth} ${height}`}
      className='overflow-visible'
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={fromColor} stopOpacity='0.6' />
          <stop offset='50%' stopColor={toColor} stopOpacity='0.8' />
          <stop offset='100%' stopColor={toColor} stopOpacity='0.6' />
        </linearGradient>
        <filter id={filterId}>
          <feGaussianBlur stdDeviation='1' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>
      {WAVE_LAYERS.map((layer, i) => (
        <path
          key={i}
          ref={(el) => {
            pathRefs.current[i] = el
          }}
          d={buildVerticalWave(height, layer.amplitude, layer.freq, 0, centerX)}
          fill='none'
          stroke={`url(#${gradId})`}
          strokeWidth={layer.width}
          strokeLinecap='round'
          opacity={layer.opacity}
          filter={`url(#${filterId})`}
        />
      ))}
    </svg>
  )
}
