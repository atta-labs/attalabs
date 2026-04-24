'use client'

import { AgentSphere, type AgentSphereProps } from '@atta/ui/agents'
import { AGENTS, type AgentName } from '@vada/agents'
import { AGENT_FACES as REDUCTIVE_FACES } from './agent-faces/agent-faces-minimal'
import { AGENT_FACES as EMBLEMATIC_FACES } from './agent-faces/agent-faces-full'

export type FaceStyle = 'reductive' | 'emblematic'
export type { AgentName }

interface VadaAgentProps extends Omit<AgentSphereProps, 'color' | 'face'> {
  /** Agent archetype name — determines color and face illustration. */
  name: AgentName
  /**
   * Face illustration register.
   * - 'reductive'  — gestural floating features
   * - 'emblematic' — symbolic portrait with sigil
   */
  faceStyle?: FaceStyle
}

export function VadaAgent({ name, faceStyle = 'emblematic', label, ...rest }: VadaAgentProps) {
  const agentDef = AGENTS[name]
  const color = agentDef?.color ?? 'var(--foreground)'
  const faces = faceStyle === 'reductive' ? REDUCTIVE_FACES : EMBLEMATIC_FACES
  const FaceComponent = faces[agentDef?.faceIndex ?? 0]
  const face = FaceComponent ? <FaceComponent /> : undefined

  return <AgentSphere color={color} face={face} label={label ?? name} {...rest} />
}
