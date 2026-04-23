'use client'

import { AIAgent, type AIAgentProps } from '@atta/ui/canvas'
import { AGENTS, type AgentName } from './agents'
import { AGENT_FACES as REDUCTIVE_FACES } from './agent-faces-minimal'
import { AGENT_FACES as EMBLEMATIC_FACES } from './agent-faces-full'

export type FaceStyle = 'reductive' | 'emblematic'
export type { AgentName }

const AGENT_INDEX: Record<AgentName, number> = {
  Strategist: 0,
  Critic: 1,
  "Devil's Advocate": 2,
  Synthesizer: 3,
  Researcher: 4,
  Operator: 5
}

interface VadaAgentProps extends Omit<AIAgentProps, 'color' | 'face'> {
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
  const color = AGENTS[name]?.color ?? 'var(--foreground)'
  const index = AGENT_INDEX[name]
  const faces = faceStyle === 'reductive' ? REDUCTIVE_FACES : EMBLEMATIC_FACES
  const FaceComponent = faces[index]
  const face = FaceComponent ? <FaceComponent /> : undefined

  return <AIAgent color={color} face={face} label={label ?? name} {...rest} />
}
