'use client'

import { type ReactNode, useEffect, useId, useRef } from 'react'
import { type SphereState, useAIAContext } from './aia-context'

const SIZE_MAP: Record<string, number> = {
  xs: 32,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128
}

const PARTICLE_MAP: Record<string, number> = {
  xs: 8,
  sm: 15,
  md: 25,
  lg: 35,
  xl: 50
}

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
  children?: ReactNode
  onClick?: () => void
  className?: string
}

function resolveColor(color: string | undefined): string {
  if (!color) {
    if (typeof document === 'undefined') return '#C8A84B'
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C8A84B'
  }
  if (color.startsWith('var(')) {
    if (typeof document === 'undefined') return '#C8A84B'
    const varName = color.replace('var(', '').replace(')', '').split(',')[0]!.trim()
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#C8A84B'
  }
  return color
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
  children,
  onClick,
  className
}: AIASphereProps) {
  const generatedId = useId()
  const id = externalId ?? generatedId
  const ref = useRef<HTMLDivElement>(null)
  const ctx = useAIAContext()
  const diameter = typeof size === 'number' ? size : (SIZE_MAP[size] ?? 64)
  const particles = particleCount ?? (typeof size === 'string' ? (PARTICLE_MAP[size] ?? 25) : 25)
  const cssColor = color ?? 'var(--accent)'

  // Keep always-current refs so the resize handler never reads stale state/showMatrix
  const stateRef = useRef(state)
  const showMatrixRef = useRef(showMatrix)
  stateRef.current = state
  showMatrixRef.current = showMatrix

  // Effect 1 — position registration, mount/unmount only.
  // MUST NOT include state/showMatrix in deps: changing them would run cleanup
  // (unregisterSphere = Map.delete) then re-register (Map.set to END), which
  // shifts every sphere's cluster assignment and makes the ring appear to rotate.
  useEffect(() => {
    if (!ctx || !ref.current || !ctx.containerRef.current) return

    const updatePosition = () => {
      if (!ref.current || !ctx.containerRef.current) return
      const sphereRect = ref.current.getBoundingClientRect()
      const containerRect = ctx.containerRef.current.getBoundingClientRect()
      const exactX = sphereRect.left - containerRect.left + sphereRect.width / 2
      const exactY = sphereRect.top - containerRect.top + sphereRect.height / 2

      // registerSphere uses Map.set on existing key — preserves insertion order ✓
      ctx.registerSphere({
        id,
        x: exactX,
        y: exactY,
        radius: diameter / 2,
        color: resolveColor(color),
        state: stateRef.current,
        particleCount: particles,
        showMatrix: showMatrixRef.current
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      ctx.unregisterSphere(id) // Only on real unmount
    }
  }, [ctx, id, diameter, color, particles]) // ← state/showMatrix deliberately excluded

  // Effect 2 — state/showMatrix sync via updateSphere (Map.set on existing key, no order change)
  useEffect(() => {
    if (!ctx) return
    ctx.updateSphere(id, { state, showMatrix })
  }, [ctx, id, state, showMatrix])

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
