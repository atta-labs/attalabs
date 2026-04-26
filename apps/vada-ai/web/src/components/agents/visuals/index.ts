export type { VadaAgentVisuals, AgentName, AgentRole, AgentEntry } from './types'

import { strategist } from './strategist'
import { critic } from './critic'
import { devilsAdvocate } from './devils-advocate'
import { synthesizer } from './synthesizer'
import { researcher } from './researcher'
import { operator } from './operator'
import type { AgentEntry, AgentName } from './types'

export const AGENT_LIST: AgentEntry[] = [
  { name: 'Strategist', role: 'strategist', visuals: strategist },
  { name: 'Critic', role: 'critic', visuals: critic },
  { name: "Devil's Advocate", role: 'devils_advocate', visuals: devilsAdvocate },
  { name: 'Synthesizer', role: 'synthesizer', visuals: synthesizer },
  { name: 'Researcher', role: 'researcher', visuals: researcher },
  { name: 'Operator', role: 'operator', visuals: operator }
]

export const AGENTS: Record<AgentName, AgentEntry> = {
  Strategist: { name: 'Strategist', role: 'strategist', visuals: strategist },
  Critic: { name: 'Critic', role: 'critic', visuals: critic },
  "Devil's Advocate": { name: "Devil's Advocate", role: 'devils_advocate', visuals: devilsAdvocate },
  Synthesizer: { name: 'Synthesizer', role: 'synthesizer', visuals: synthesizer },
  Researcher: { name: 'Researcher', role: 'researcher', visuals: researcher },
  Operator: { name: 'Operator', role: 'operator', visuals: operator }
}

export const AGENT_SPHERE_COLORS = AGENT_LIST.map((a) => a.visuals.color) as [
  string,
  string,
  string,
  string,
  string,
  string
]

export const AGENT_COLOR_BY_ROLE: Record<string, string> = Object.fromEntries(
  AGENT_LIST.map((a) => [a.role, a.visuals.color])
)

export const AGENT_BY_ROLE: Record<string, AgentEntry> = Object.fromEntries(AGENT_LIST.map((a) => [a.role, a]))

export const AGENT_THEME: Record<string, { color: string; label: string }> = Object.fromEntries(
  AGENT_LIST.map((a) => [a.name, { color: a.visuals.color, label: a.visuals.tagline }])
)
