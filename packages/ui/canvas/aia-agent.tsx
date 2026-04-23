'use client'

import { AIASphere } from './aia-sphere'
import { AgentThinkingText } from '@atta/ui/shared'
import { ModelIcon as LobeModelIcon } from '@lobehub/icons'
import type { ReactNode } from 'react'
import type { SphereState } from './aia-context'

// Face inset per sphere size — how much to shrink the face relative to the sphere diameter.
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

export interface AIAgentProps {
  /** Agent color — CSS variable or value, applied to sphere and face illustration. */
  color: string
  /** Face illustration to render inside the sphere. Pass a ReactNode; resolved by caller. */
  face?: ReactNode
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
  /** Label rendered below (or around) the sphere. */
  label?: string
  /** Position of the label relative to the sphere. */
  labelPosition?: 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left' | 'top-left'
  /** Hide the label entirely. */
  noLabel?: boolean
  onClick?: () => void
  className?: string
  /** Opacity of the face illustration (0–1). Default 0.5. */
  faceOpacity?: number
  /** Text rendered inside the sphere with the typewriter scramble effect. */
  thinkingText?: string
  /** Content rendered inside the sphere, above the face layer. */
  children?: ReactNode
  /** Model id (e.g. 'claude-opus-4-7'). When set, a small badge with the model icon is rendered. */
  model?: string
  /** Tooltip text shown on hover of the model badge. */
  modelLabel?: string
}

export function AIAgent({
  color,
  face,
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
      label={noLabel ? undefined : label}
      onClick={onClick}
      className={className}
      labelPosition={labelPosition}
      badge={badge}
    >
      {face && (
        <div
          className='absolute pointer-events-none z-0'
          style={{ inset: faceInset, top: `calc(${faceInset} + 28%)`, opacity: faceOpacity, color }}
        >
          {face}
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
