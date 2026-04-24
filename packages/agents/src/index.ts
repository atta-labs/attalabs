export type { VadaAgentDef, AgentName } from './types'

export { a0Solo } from './agents/a0-solo'
export { a1Solo } from './agents/a1-solo'
export { strategist } from './agents/strategist'
export { critic } from './agents/critic'
export { devilsAdvocate } from './agents/devils-advocate'
export { synthesizer } from './agents/synthesizer'
export { conclusionSynthesizer } from './agents/conclusion-synthesizer'
export { blindCritic } from './agents/blind-critic'
export { factChecker } from './agents/fact-checker'

import { strategist } from './agents/strategist'
import { critic } from './agents/critic'
import { devilsAdvocate } from './agents/devils-advocate'
import { synthesizer } from './agents/synthesizer'
import type { VadaAgentDef, AgentName } from './types'

/** Keyed lookup for display-capable agents. */
export const AGENTS: Record<AgentName, VadaAgentDef> = {
  Strategist: strategist,
  Critic: critic,
  "Devil's Advocate": devilsAdvocate,
  Synthesizer: synthesizer
}

/** Ordered list — canonical deliberation sequence. */
export const AGENT_LIST: VadaAgentDef[] = [strategist, critic, devilsAdvocate, synthesizer]
