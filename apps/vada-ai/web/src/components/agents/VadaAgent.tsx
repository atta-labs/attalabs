'use client'

import { AgentSphere, type AgentSphereProps } from '@atta/ui/agents'
import { AGENTS, AGENT_BY_ROLE, type AgentName, type AgentRole } from '@/components/agents/visuals'
import { ModelOrProviderIcon } from './ModelOrProviderIcon'
import { AGENT_FACES as REDUCTIVE_FACES } from './faces/agent-faces-minimal'
import { AGENT_FACES as EMBLEMATIC_FACES } from './faces/agent-faces-full'
import { VENDORS, inferVendor } from './vendors'

export type FaceStyle = 'reductive' | 'emblematic'
export type { AgentName, AgentRole }

interface VadaAgentProps extends Omit<AgentSphereProps, 'color' | 'face' | 'faceTranslateY'> {
  /** Agent name — used for name-based lookup when no role is provided. */
  name: string
  /** Agent role — preferred lookup; falls back to name, then vendor. */
  role?: AgentRole
  /** Model string — used to infer vendor color when no role/name match is found. */
  model?: string
  /**
   * Face illustration register.
   * - 'reductive'  — gestural floating features
   * - 'emblematic' — symbolic portrait with sigil
   */
  faceStyle?: FaceStyle
}

export function VadaAgent({
  name,
  role,
  model,
  faceStyle = 'emblematic',
  label,
  faceOpacity: faceOpacityProp,
  ...rest
}: VadaAgentProps) {
  const agentDef = role ? (AGENT_BY_ROLE[role] ?? AGENTS[name as AgentName]) : AGENTS[name as AgentName]

  const color = agentDef
    ? agentDef.visuals.color
    : model
      ? (VENDORS[inferVendor(model) ?? 'anthropic']?.color ?? 'var(--foreground)')
      : 'var(--foreground)'

  let face: React.ReactNode | undefined
  let faceOpacity = faceOpacityProp
  let faceTranslateY: string | undefined

  if (agentDef) {
    const faces = faceStyle === 'reductive' ? REDUCTIVE_FACES : EMBLEMATIC_FACES
    const FaceComponent = faces[agentDef.visuals.faceIndex]
    face = FaceComponent ? <FaceComponent /> : undefined
  } else if (model) {
    face = <ModelOrProviderIcon model={model} size={36} />
    faceOpacity = faceOpacityProp ?? 0.9
    faceTranslateY = '0'
  }

  // Catalog-aware badge icon — falls back to provider logo for non-Lobehub models
  // (Groq's Compound, Allam, etc.). Without this, the badge renders as an empty
  // square because LobeModelIcon doesn't recognize those model IDs.
  const badgeIcon = model ? <ModelOrProviderIcon model={model} size={20} /> : undefined

  return (
    <AgentSphere
      color={color}
      face={face}
      faceOpacity={faceOpacity}
      faceTranslateY={faceTranslateY}
      // Roled agents: forward model so AgentSphere renders the bottom-right badge.
      // Unroled agents: model is consumed as the face icon above; no badge needed.
      model={agentDef ? model : undefined}
      modelIcon={agentDef ? badgeIcon : undefined}
      label={label ?? name}
      {...rest}
    />
  )
}
