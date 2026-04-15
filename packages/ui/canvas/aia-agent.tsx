'use client'

// ── AIAgent.tsx ───────────────────────────────────────────────────────────────
// Convenience wrapper around AIASphere that resolves agent color and face from
// the canonical agent name. Accepts a faceStyle to switch between the two face
// illustration registers: 'reductive' (gestural, floating features) and
// 'emblematic' (symbolic portrait with forehead sigil).

import { AGENT_FACES as REDUCTIVE_FACES } from './agent-faces-minimal'
import { AGENT_FACES as EMBLEMATIC_FACES } from './agent-faces-full'
import { AIASphere } from './aia-sphere'
import { AGENTS, type AgentName } from '@atta/agents'
import type { ReactNode } from 'react'
import type { SphereState } from './aia-context'

export type { AgentName }

const AGENT_INDEX: Record<AgentName, number> = {
  Strategist: 0,
  Critic: 1,
  "Devil's Advocate": 2,
  Synthesizer: 3,
  Researcher: 4,
  Operator: 5
}

export type FaceStyle = 'reductive' | 'emblematic'

// Face inset per sphere size — how much to shrink the face relative to the sphere diameter.
// Larger spheres get a smaller inset (face fills more of the circle).
// Numeric sizes fall back to the 'md' value.
const FACE_INSET: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: '18%',
  sm: '15%',
  md: '12%',
  lg: '10%',
  xl: '8%'
}

interface AIAgentProps {
  /** Agent archetype name — determines color and face illustration. */
  name: AgentName
  /**
   * Face illustration register.
   * - 'reductive'  — gestural floating features (Glance / minimal)
   * - 'emblematic' — symbolic portrait with sigil (Glyph / full)
   */
  faceStyle?: FaceStyle
  /** Sphere size preset or explicit pixel diameter. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  /** Sphere animation state. */
  state?: SphereState
  /** Stable unique ID for canvas particle tracking. Use useId() in lists. */
  id?: string
  /** Show matrix rain inside the sphere. */
  showMatrix?: boolean
  /** Matrix rain opacity multiplier. */
  matrixOpacity?: number
  /** Number of canvas particles requested for this sphere. */
  particleCount?: number
  /** Render a dark background circle behind the sphere. */
  solidBg?: boolean
  /** Whether the sphere is visible (particles still orbit when false). */
  visible?: boolean
  /** Optional label. Defaults to the agent name. */
  label?: string
  /** Position of the label relative to the sphere. */
  labelPosition?: 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left' | 'top-left'
  /** Hide the label entirely. */
  noLabel?: boolean
  onClick?: () => void
  className?: string
  /** Opacity of the face illustration (0–1). Default 0.25. */
  faceOpacity?: number
  /** Content rendered inside the sphere, above the face layer. */
  children?: ReactNode
}

export function AIAgent({
  name,
  faceStyle = 'emblematic',
  size = 'md',
  state = 'idle',
  id,
  showMatrix,
  matrixOpacity = 0.5,
  particleCount = 150,
  solidBg,
  visible = true,
  label,
  labelPosition,
  noLabel = false,
  faceOpacity = 0.5,
  onClick,
  className,
  children
}: AIAgentProps) {
  const index = AGENT_INDEX[name]
  const color = AGENTS[name]?.color ?? 'var(--foreground)'
  const faces = faceStyle === 'reductive' ? REDUCTIVE_FACES : EMBLEMATIC_FACES
  const FaceComponent = faces[index]
  const faceInset =
    typeof size === 'string' ? FACE_INSET[size] : `${Math.round(Math.max(4, Math.min(20, 20 - size / 10)))}%`

  return (
    <AIASphere
      id={id}
      size={size}
      color={color}
      state={state}
      showMatrix={showMatrix}
      matrixOpacity={matrixOpacity}
      particleCount={particleCount}
      solidBg={solidBg}
      visible={visible}
      label={noLabel ? undefined : (label ?? name)}
      onClick={onClick}
      className={className}
      labelPosition={labelPosition}
    >
      {FaceComponent && (
        <div className='absolute pointer-events-none z-0' style={{ inset: faceInset, opacity: faceOpacity, color }}>
          <FaceComponent />
        </div>
      )}
      {children}
    </AIASphere>
  )
}
