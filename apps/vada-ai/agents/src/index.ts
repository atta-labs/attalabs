export type { VadaAgentDef, AgentName } from './types'
/** Backward-compatible alias — prefer VadaAgentDef in new code. */
export type { VadaAgentDef as AgentDef } from './types'

export { a0Solo } from './agents/a0-solo'
export { a1Solo } from './agents/a1-solo'
export { strategist } from './agents/strategist'
export { critic } from './agents/critic'
export { devilsAdvocate } from './agents/devils-advocate'
export { synthesizer } from './agents/synthesizer'
export { researcher } from './agents/researcher'
export { operator } from './agents/operator'
export { conclusionSynthesizer } from './agents/conclusion-synthesizer'
export { blindCritic } from './agents/blind-critic'
export { factChecker } from './agents/fact-checker'
export { domainExpert, createDomainExpert } from './agents/domain-expert'

import { strategist } from './agents/strategist'
import { critic } from './agents/critic'
import { devilsAdvocate } from './agents/devils-advocate'
import { synthesizer } from './agents/synthesizer'
import { researcher } from './agents/researcher'
import { operator } from './agents/operator'
import type { VadaAgentDef, AgentName } from './types'

/** Keyed lookup for all display-capable agents. */
export const AGENTS: Record<AgentName, VadaAgentDef> = {
  Strategist: strategist,
  Critic: critic,
  "Devil's Advocate": devilsAdvocate,
  Synthesizer: synthesizer,
  Researcher: researcher,
  Operator: operator
}

/** Ordered list — canonical deliberation sequence (Strategist → Operator). */
export const AGENT_LIST: VadaAgentDef[] = [strategist, critic, devilsAdvocate, synthesizer, researcher, operator]

/** Ordered color array — use when you need colors by sphere index. */
export const AGENT_SPHERE_COLORS = AGENT_LIST.map((a) => a.color) as [string, string, string, string, string, string]

/** Role-slug keyed color map — use when you have a slug from API responses. */
export const AGENT_COLOR_BY_ROLE: Record<string, string> = Object.fromEntries(AGENT_LIST.map((a) => [a.role, a.color]))

/** Role-slug keyed full agent lookup — use when you have a slug from API/SSE. */
export const AGENT_BY_ROLE: Record<string, VadaAgentDef> = Object.fromEntries(AGENT_LIST.map((a) => [a.role, a]))

/** Name-keyed display map — use when you have an agent name string from API/SSE. */
export const AGENT_THEME: Record<string, { color: string; label: string }> = Object.fromEntries(
  AGENT_LIST.map((a) => [a.name, { color: a.color, label: a.tagline }])
)
