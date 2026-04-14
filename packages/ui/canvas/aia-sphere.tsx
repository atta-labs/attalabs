// ── aia-sphere.tsx ────────────────────────────────────────────────────────────
// Pure presentational component. All hooks live in useAIASphere.

'use client'

import type { ReactNode } from 'react'
import type { SphereState } from './aia-context'
import { useAIASphere } from './useAIASphere'

type LabelPosition = 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left' | 'top-left'

interface AIASphereProps {
  id?: string
  state?: SphereState
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  label?: string
  labelPosition?: LabelPosition
  particleCount?: number
  showMatrix?: boolean
  solidBg?: boolean
  bgOpacity?: number
  children?: ReactNode
  onClick?: () => void
  className?: string
  matrixColors?: string[]
  matrixOpacity?: number
}

const LABEL_STYLES: Record<LabelPosition, React.CSSProperties> = {
  top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
  'top-right': { bottom: '100%', left: '100%', marginBottom: 4, marginLeft: -8 },
  right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 },
  'bottom-right': { top: '100%', left: '100%', marginTop: 4, marginLeft: -8 },
  bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
  'bottom-left': { top: '100%', right: '100%', marginTop: 4, marginRight: -8 },
  left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 },
  'top-left': { bottom: '100%', right: '100%', marginBottom: 4, marginRight: -8 }
}

export function AIASphere({
  id: externalId,
  state = 'idle',
  color,
  size = 'md',
  label,
  labelPosition = 'bottom',
  particleCount,
  showMatrix = true,
  solidBg = false,
  bgOpacity,
  children,
  onClick,
  className,
  matrixColors,
  matrixOpacity
}: AIASphereProps) {
  const { ref, diameter, cssColor } = useAIASphere({
    id: externalId,
    state,
    color,
    size,
    particleCount,
    showMatrix,
    matrixColors,
    matrixOpacity,
    solidBg,
    bgOpacity
  })

  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLButtonElement>}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={className}
      style={{
        position: 'relative',
        width: diameter,
        height: diameter,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : undefined,
        outline: 'none',
        border: 'none',
        borderRadius: '50%',
        background: onClick ? 'none' : undefined,
        padding: 0
      }}
    >
      {children && (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: '50%'
          }}
        >
          {children}
        </div>
      )}

      {label && (
        <span
          style={{
            position: 'absolute',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: state === 'idle' ? 'var(--muted-foreground)' : cssColor,
            opacity: state === 'idle' ? 0.4 : 0.8,
            ...LABEL_STYLES[labelPosition]
          }}
        >
          {label}
        </span>
      )}
    </Tag>
  )
}
