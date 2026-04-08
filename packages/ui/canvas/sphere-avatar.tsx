'use client'

import type { SphereState } from './aia-context'

const SIZE_MAP: Record<string, number> = {
  xs: 32,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128
}

interface SphereAvatarProps {
  state?: SphereState
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  className?: string
}

export function SphereAvatar({ state = 'idle', color = '#C8A84B', size = 'md', className }: SphereAvatarProps) {
  const diameter = typeof size === 'number' ? size : (SIZE_MAP[size] ?? 64)
  const fontSize = Math.max(6, Math.round(diameter * 0.28))

  return (
    <div className={className} style={{ position: 'relative', width: diameter, height: diameter, flexShrink: 0 }}>
      {/* Expanding ping ring while speaking */}
      {state === 'speaking' && (
        <span
          className='absolute inset-0 animate-ping rounded-full'
          style={{ backgroundColor: color, opacity: 0.25 }}
        />
      )}

      {/* Core circle */}
      <span
        className='absolute inset-0 rounded-full transition-all duration-300'
        style={{
          backgroundColor: state === 'idle' ? 'transparent' : color,
          border: `1.5px solid ${color}`,
          opacity: state === 'idle' ? 0.35 : state === 'complete' ? 0.75 : 1
        }}
      />

      {/* AI monogram — centered, visible in speaking/complete */}
      {state !== 'idle' && (
        <span
          className='absolute inset-0 flex items-center justify-center'
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize,
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: 'var(--background, #0D0B08)',
            opacity: 0.85,
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          AI
        </span>
      )}
    </div>
  )
}
