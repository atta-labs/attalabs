'use client'

import { AgentSphere, type AgentSphereProps } from '@atta/ui/agents'
import { AGENTS, AGENT_BY_ROLE, type AgentName, type AgentRole } from '@/components/agents/visuals'
import { ModelOrProviderIcon, NoModelSelectedIcon } from './ModelOrProviderIcon'
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
  /**
   * Whether the user has explicitly selected a model for this reviewer slot.
   *
   * - `true`  — user has picked a model; render vendor icon + vendor color as usual.
   * - `false` (default for reviewer slots) — show empty grey sphere regardless of
   *   whether a YAML default model is present. The YAML model still flows to the
   *   engine for execution; this flag controls UI presentation only.
   *
   * Roled agents (Synthesizer, FactChecker, etc.) ignore this prop entirely —
   * they always render their fixed portrait and color via AGENT_BY_ROLE.
   */
  userConfigured?: boolean
}

export function VadaAgent({
  name,
  role,
  model,
  faceStyle = 'emblematic',
  label,
  faceOpacity: faceOpacityProp,
  userConfigured,
  ...rest
}: VadaAgentProps) {
  const agentDef = role ? (AGENT_BY_ROLE[role] ?? AGENTS[name as AgentName]) : AGENTS[name as AgentName]

  // Roled agents always use their fixed identity color.
  // Reviewer slots: use vendor color only when the user has explicitly configured
  // a model (userConfigured=true). Otherwise fall through to muted grey so the
  // sphere communicates "you choose" without implying a vendor.
  const color = agentDef
    ? agentDef.visuals.color
    : userConfigured && model
      ? (VENDORS[inferVendor(model) ?? 'anthropic']?.color ?? 'var(--foreground)')
      : 'var(--muted-foreground)'

  let face: React.ReactNode | undefined
  let faceOpacity = faceOpacityProp
  let faceTranslateY: string | undefined

  if (agentDef) {
    // Roled agents: fixed portrait face, unaffected by userConfigured.
    const faces = faceStyle === 'reductive' ? REDUCTIVE_FACES : EMBLEMATIC_FACES
    const FaceComponent = faces[agentDef.visuals.faceIndex]
    face = FaceComponent ? <FaceComponent /> : undefined
  } else if (userConfigured && model) {
    // Reviewer slot explicitly configured by the user — show vendor icon.
    face = <ModelOrProviderIcon model={model} size={36} />
    faceOpacity = faceOpacityProp ?? 0.9
    faceTranslateY = '0'
  } else {
    // Reviewer slot not yet configured by the user (empty+grey).
    // The YAML default model may be present in the `model` prop for engine
    // execution purposes, but we intentionally suppress vendor identity here.
    // Show neutral "you choose" glyph with muted styling.
    face = <NoModelSelectedIcon size={36} />
    faceOpacity = faceOpacityProp ?? 0.7
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
      // Configured reviewer slots: model consumed as face icon above; no badge needed.
      // Unconfigured reviewer slots: no model badge — keeps the sphere clean.
      model={agentDef ? model : undefined}
      modelIcon={agentDef ? badgeIcon : undefined}
      label={label ?? name}
      {...rest}
    />
  )
}
