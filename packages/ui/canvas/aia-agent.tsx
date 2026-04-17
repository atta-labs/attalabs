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
import { AgentThinkingText } from '@atta/ui/shared'
import { ModelIcon as LobeModelIcon } from '@lobehub/icons'
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
  xs: '6%',
  sm: '4%',
  md: '2%',
  lg: '1%',
  xl: '0%'
}

// Thinking text font size per sphere size — proportional to diameter.
const THINKING_TEXT_PX: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 4,
  sm: 5,
  md: 6,
  lg: 7,
  xl: 9
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
  /** Text rendered inside the sphere with the typewriter scramble effect. */
  thinkingText?: string
  /** Content rendered inside the sphere, above the face layer. */
  children?: ReactNode
  /** Model id (e.g. 'claude-opus-4-7'). When set, a small badge with the model icon is rendered at the sphere's bottom-right. */
  model?: string
  /** Tooltip text shown on hover of the model badge. Typically the model label + version. */
  modelLabel?: string
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
  thinkingText,
  onClick,
  className,
  children,
  model,
  modelLabel
}: AIAgentProps) {
  const index = AGENT_INDEX[name]
  const color = AGENTS[name]?.color ?? 'var(--foreground)'
  const faces = faceStyle === 'reductive' ? REDUCTIVE_FACES : EMBLEMATIC_FACES
  const FaceComponent = faces[index]
  const faceInset =
    typeof size === 'string' ? FACE_INSET[size] : `${Math.round(Math.max(4, Math.min(20, 20 - size / 10)))}%`
  const thinkingFontPx =
    typeof size === 'string' ? THINKING_TEXT_PX[size] : Math.round(Math.max(4, Math.min(10, size / 14)))

  const badge = model ? (
    <span
      title={modelLabel ?? model}
      className='flex items-center justify-center rounded-md border border-border bg-card p-0.5 shadow-sm'
    >
      <LobeModelIcon model={model} size={20} type='avatar' />
    </span>
  ) : undefined

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
      badge={badge}
    >
      {FaceComponent && (
        <div
          className='absolute pointer-events-none z-0'
          style={{ inset: faceInset, top: `calc(${faceInset} + 28%)`, opacity: faceOpacity, color }}
        >
          <FaceComponent />
        </div>
      )}
      {showMatrix && thinkingText && (
        <div
          className='absolute flex justify-center pointer-events-none z-10 overflow-hidden'
          style={{ top: '18%', left: '20%', right: '20%', color, fontSize: thinkingFontPx }}
        >
          <AgentThinkingText text={thinkingText} className='text-center leading-tight opacity-80 truncate' />
        </div>
      )}
      {children}
    </AIASphere>
  )
}
