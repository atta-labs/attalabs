// ── teams.ts ──────────────────────────────────────────────────────────────────
// Canonical team compositions for Vada deliberation sessions.
// A team is a named roster of agents. Engine-level config (temperature, model)
// lives in the Vada app — teams own only identity and composition.

import type { AgentName } from './agents'

export type TeamId = 'crucible' | 'war_room' | 'sparring'

export interface TeamDef {
  id: TeamId
  name: string
  subtitle: string
  /** What this team does and why — 2–3 sentences for a team picker UI. */
  description: string
  /** Single-sentence primary goal. */
  objective: string
  /** Situations where this team excels — shown as bullet list in UI. */
  bestFor: string[]
  /** What the user receives at the end of the session. */
  delivers: string[]
  /** Ordered agent roster — canonical AgentNames. */
  agents: AgentName[]
}

export const TEAMS: Record<TeamId, TeamDef> = {
  crucible: {
    id: 'crucible',
    name: 'The Crucible',
    subtitle: 'A rigorous teardown that finds fatal flaws and rebuilds your premise.',
    description:
      "The Crucible is Vada's standard deliberation format. Four agents — Strategist, Critic, Devil's Advocate, and Synthesizer — debate your question across three structured rounds before producing a schema-validated conclusion. The Blind Critic then audits that conclusion for logical consistency and formatting before it reaches you.",
    objective:
      'Stress-test a premise through structured multi-agent debate and deliver a validated, actionable conclusion.',
    bestFor: [
      "Decisions with multiple viable options you can't easily compare",
      'Questions where you suspect your own thinking has blind spots',
      'Premises that need adversarial pressure before you commit',
      'When you want a structured conclusion with explicit unresolved points'
    ],
    delivers: [
      'Structured conclusion: recommendation, key condition, unresolved points, and review date',
      'Blind Critic audit verdict (Clean, Revised, or Unconverged)',
      'Full 3-round transcript showing how the room arrived at its position'
    ],
    agents: ['Strategist', 'Critic', "Devil's Advocate", 'Synthesizer']
  },
  war_room: {
    id: 'war_room',
    name: 'The War Room',
    subtitle: 'Heavyweight analysis forcing abstract strategy to survive physical reality.',
    description:
      "The War Room adds a Researcher and an Operator to The Crucible's core four. The Researcher grounds every argument in evidence and precedent; the Operator stress-tests whether any proposed strategy can actually be executed. This is the heavyweight configuration — use it when both the validity of evidence and the feasibility of execution are load-bearing.",
    objective:
      'Produce a conclusion that survives empirical scrutiny and execution stress-testing, not just logical debate.',
    bestFor: [
      'High-stakes strategic decisions where evidence and feasibility both matter',
      'Complex questions that require historical precedents or external data to resolve',
      'Plans that need to survive contact with operational reality before you act on them',
      'When you need the most thorough analysis Vada can produce'
    ],
    delivers: [
      'Everything The Crucible delivers, plus evidence grounding from the Researcher',
      'Execution feasibility analysis from the Operator before the conclusion is drawn',
      'The most comprehensive transcript in Vada — all six agents across three rounds'
    ],
    agents: ['Strategist', 'Critic', "Devil's Advocate", 'Synthesizer', 'Researcher', 'Operator']
  },
  sparring: {
    id: 'sparring',
    name: 'The Sparring Match',
    subtitle: 'Fast, adversarial friction. No formal conclusion.',
    description:
      'The Sparring Match is a fast, adversarial two-agent exchange between the Strategist and the Critic. There is no Synthesizer, no conclusion protocol, and no structured output — just raw friction. Three volleys by default, five maximum. Use it to pressure-test an idea quickly or to sharpen your thinking before committing to a full deliberation.',
    objective: 'Generate fast adversarial friction around an idea with no formal conclusion — pure pressure-testing.',
    bestFor: [
      'Quickly probing whether an idea holds up under criticism',
      'Warming up a question before running a full Crucible or War Room',
      'Situations where you want tension and challenge, not synthesis or resolution',
      'Exploratory thinking where a formal conclusion would be premature'
    ],
    delivers: [
      'Raw adversarial transcript — no structured conclusion',
      '3–5 volleys of direct Strategist vs. Critic exchange',
      'Option to push to The Crucible if the sparring reveals a question worth resolving fully'
    ],
    agents: ['Strategist', 'Critic']
  }
}

export const TEAM_LIST: TeamDef[] = [TEAMS.crucible, TEAMS.war_room, TEAMS.sparring]
