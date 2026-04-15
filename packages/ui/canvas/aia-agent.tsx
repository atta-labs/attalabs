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
  /** Render a dark background circle behind the sphere. */
  solidBg?: boolean
  /** Whether the sphere is visible (particles still orbit when false). */
  visible?: boolean
  /** Optional label below the sphere. Defaults to the agent name. */
  label?: string
  /** Hide the label entirely. */
  noLabel?: boolean
  onClick?: () => void
  className?: string
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
  matrixOpacity,
  solidBg,
  visible = true,
  label,
  noLabel = false,
  onClick,
  className,
  children
}: AIAgentProps) {
  const index = AGENT_INDEX[name]
  const color = AGENTS[name]?.color ?? 'var(--foreground)'
  const faces = faceStyle === 'reductive' ? REDUCTIVE_FACES : EMBLEMATIC_FACES
  const FaceComponent = faces[index]

  return (
    <AIASphere
      id={id}
      size={size}
      color={color}
      state={state}
      showMatrix={showMatrix}
      matrixOpacity={matrixOpacity}
      solidBg={solidBg}
      visible={visible}
      label={noLabel ? undefined : (label ?? name)}
      face={FaceComponent ? <FaceComponent /> : undefined}
      onClick={onClick}
      className={className}
    >
      {children}
    </AIASphere>
  )
}
