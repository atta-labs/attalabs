// ── aia-sphere.tsx ────────────────────────────────────────────────────────────
// Pure presentational component. All hooks live in useAIASphere.
// Self-sufficient: when rendered outside an AIACanvas, wraps itself in one.

'use client'

import type { ReactNode } from 'react'
import type { SphereState } from './aia-context'
import { useAIAContext } from './aia-context'
import { useAIASphere } from './useAIASphere'
import { AIACanvas } from './aia-canvas'

const SPHERE_DIAMETER: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 32,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128
}

type LabelPosition = 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left' | 'top-left'

interface AIASphereProps {
  id?: string
  state?: SphereState
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  label?: string
  /**
   * Label layout:
   * - 'flow' (default): label renders as a flex sibling below the sphere — participates in layout.
   * - 'absolute': label is absolutely positioned relative to the sphere's bbox (for orbit/ring layouts where the sphere's bbox must stay == diameter × diameter).
   */
  labelPlacement?: 'flow' | 'absolute'
  /** Only used when labelPlacement='absolute'. */
  labelPosition?: LabelPosition
  particleCount?: number
  showMatrix?: boolean
  solidBg?: boolean
  bgOpacity?: number
  visible?: boolean
  children?: ReactNode
  /** Overlay slot (e.g. a model-icon badge). Rendered outside the circular clip, anchored bottom-right. */
  badge?: ReactNode
  /** Secondary overlay slot. Rendered outside the circular clip, anchored bottom-left. */
  badgeLeft?: ReactNode
  onClick?: () => void
  className?: string
  matrixColors?: string[]
  matrixOpacity?: number
}

const ABSOLUTE_LABEL_STYLES: Record<LabelPosition, React.CSSProperties> = {
  top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
  'top-right': { bottom: '100%', left: '100%', marginBottom: 4, marginLeft: -8 },
  right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 },
  'bottom-right': { top: '100%', left: '100%', marginTop: 4, marginLeft: -8 },
  bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
  'bottom-left': { top: '100%', right: '100%', marginTop: 4, marginRight: -8 },
  left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 },
  'top-left': { bottom: '100%', right: '100%', marginBottom: 4, marginRight: -8 }
}

const LABEL_TEXT_STYLE = (state: SphereState, cssColor: string): React.CSSProperties => ({
  whiteSpace: 'nowrap',
  fontFamily: 'var(--font-mono, monospace)',
  fontSize: 9,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: state === 'idle' ? 'var(--muted-foreground)' : cssColor,
  opacity: state === 'idle' ? 0.4 : 0.8
})

function AIASphereInner({
  id: externalId,
  state = 'idle',
  color,
  size = 'md',
  label,
  labelPlacement = 'flow',
  labelPosition = 'bottom',
  particleCount,
  showMatrix = true,
  solidBg = false,
  bgOpacity,
  visible = true,
  children,
  badge,
  badgeLeft,
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
    bgOpacity,
    visible
  })

  const Tag = onClick ? 'button' : 'div'

  const sphere = (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLButtonElement>}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={labelPlacement === 'flow' ? undefined : className}
      style={{
        position: 'relative',
        width: diameter,
        height: diameter,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
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
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            overflow: 'hidden',
            borderRadius: '50%'
          }}
        >
          {children}
        </div>
      )}

      {label && labelPlacement === 'absolute' && (
        <span
          style={{
            position: 'absolute',
            ...LABEL_TEXT_STYLE(state, cssColor),
            ...ABSOLUTE_LABEL_STYLES[labelPosition]
          }}
        >
          {label}
        </span>
      )}

      {badge && (
        <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', zIndex: 2, display: 'inline-flex' }}>
          {badge}
        </span>
      )}
      {badgeLeft && (
        <span style={{ position: 'absolute', bottom: '-4px', left: '-4px', zIndex: 2, display: 'inline-flex' }}>
          {badgeLeft}
        </span>
      )}
    </Tag>
  )

  // No label OR absolute label — sphere stands alone (bbox == diameter × diameter, which is what ring/orbit layouts rely on).
  if (!label || labelPlacement === 'absolute') return sphere

  // Flow label — wrap sphere + label in a flex-col so the label participates in layout.
  // The ref still points to the inner sphere element, so canvas position tracking is unaffected.
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
    >
      {sphere}
      <span style={LABEL_TEXT_STYLE(state, cssColor)}>{label}</span>
    </span>
  )
}

export function AIASphere(props: Parameters<typeof AIASphereInner>[0]) {
  const ctx = useAIAContext()

  if (ctx) return <AIASphereInner {...props} />

  // Standalone: layout anchor is sphere-sized so surrounding flex/grid is unaffected.
  // Canvas extends beyond with negative inset giving particles room to orbit outside.
  const { size = 'md', label, labelPlacement = 'flow', state = 'idle', color, className } = props
  const diameter = typeof size === 'string' ? SPHERE_DIAMETER[size] : size
  const pad = diameter
  const canvasSize = diameter + pad * 2

  // The sphere canvas block — layout anchor is always sphere-sized.
  // Only inline styles for runtime-computed numeric values (width/height/inset/top/left).
  // Position utilities use Tailwind classes.
  const sphereBlock = (
    <div className='relative' style={{ width: diameter, height: diameter }}>
      {/* pointer-events-none: the ambient canvas padding extends beyond the sphere's bbox
          and must not intercept clicks on surrounding content (e.g. links above/below the sphere). */}
      <div className='absolute' style={{ inset: -pad, pointerEvents: 'none' }}>
        {/* No className on AIACanvas — avoids relative/absolute Tailwind class conflict that collapses containerRef height to 0. */}
        {/* Explicit-size inner div drives containerRef height instead. */}
        <AIACanvas wanderDuration={0} alwaysRenderSpheres>
          <div className='relative' style={{ width: canvasSize, height: canvasSize }}>
            {/* Sphere at (pad, pad) aligns the face with the layout anchor. */}
            {/* pointer-events: auto re-enables pointer events so onClick spheres remain clickable. */}
            <div className='absolute' style={{ top: pad, left: pad, pointerEvents: 'auto' }}>
              {/* Suppress flow label here — rendered outside the canvas container so it participates in DOM layout flow. */}
              <AIASphereInner {...props} label={labelPlacement !== 'absolute' ? undefined : label} />
            </div>
          </div>
        </AIACanvas>
      </div>
    </div>
  )

  // Absolute label: handled inside AIASphereInner relative to sphere bbox. No wrapping needed.
  // No label: sphere block is the complete element.
  if (!label || labelPlacement === 'absolute') return sphereBlock

  // Flow label: render OUTSIDE the canvas absolute container so it participates in parent layout flow.
  // Mirrors AIASphereInner's flow-label wrapping pattern exactly.
  const cssColor = color ?? 'var(--foreground)'
  return (
    <span className={`inline-flex flex-col items-center gap-1.5${className ? ` ${className}` : ''}`}>
      {sphereBlock}
      <span style={LABEL_TEXT_STYLE(state, cssColor)}>{label}</span>
    </span>
  )
}
