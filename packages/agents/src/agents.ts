// ── agents.ts ─────────────────────────────────────────────────────────────────
// Single source of truth for every agent in the Vada deliberation system.
// Import from here whenever you need anything about an agent — color, name,
// face index, role slug, description, or voice.
// All colors reference CSS variables defined in packages/ui/styles/globals.css.

export type AgentName = 'Strategist' | 'Critic' | "Devil's Advocate" | 'Synthesizer' | 'Researcher' | 'Operator'

export type AgentRole = 'strategist' | 'critic' | 'devils_advocate' | 'synthesizer' | 'researcher' | 'operator'

export interface AgentDef {
  /** Canonical name — used as key and for display. */
  name: AgentName
  /** Slug — matches API responses and schema keys. */
  role: AgentRole
  /** Full title with article ('The Strategist'). */
  displayName: string
  /** Agent color — CSS variable, always visible on dark backgrounds. */
  color: string
  /** One-line tagline shown under sphere labels. */
  tagline: string
  /** What the agent does in a deliberation. */
  function: string
  /** How the agent fills its structural role. */
  roleDesc: string
  /** The agent's characteristic voice and rhetorical style. */
  voice: string
}

export const AGENTS: Record<AgentName, AgentDef> = {
  Strategist: {
    name: 'Strategist',
    role: 'strategist',
    displayName: 'The Strategist',
    color: 'var(--agent-strategist)',
    tagline: 'Maps the landscape',
    function: 'Maps the landscape, governs deliberation trajectory',
    roleDesc:
      'Identifies the Grand Objective and ensures all sub-threads serve the terminal goal of resolving the core inquiry',
    voice: 'Measured, prescriptive, and teleological. Speaks in frameworks and milestones.'
  },
  Critic: {
    name: 'Critic',
    role: 'critic',
    displayName: 'The Critic',
    color: 'var(--agent-critic)',
    tagline: "Finds what's wrong",
    function: 'Analytical interrogation of premises and logical consistency',
    roleDesc: 'Detects fallacies and demands empirical grounding for every assertion made in the room',
    voice: 'Sparse and clinical. Values brevity and precision, often responding with targeted, reductive questions.'
  },
  "Devil's Advocate": {
    name: "Devil's Advocate",
    role: 'devils_advocate',
    displayName: "The Devil's Advocate",
    color: 'var(--agent-devils-advocate)',
    tagline: 'Challenges the frame',
    function: 'Mandatory contrarian perspective generation',
    roleDesc:
      'Prevents early consensus by identifying counter-arguments and unexplored failure modes in every position',
    voice: "Provocative and speculative. Uses 'What if' scenarios to dismantle comfortable assumptions."
  },
  Synthesizer: {
    name: 'Synthesizer',
    role: 'synthesizer',
    displayName: 'The Synthesizer',
    color: 'var(--agent-synthesizer)',
    tagline: 'Draws threads together',
    function: 'Reconciles contradictions between competing arguments',
    roleDesc: 'Weaves disparate viewpoints into a cohesive, actionable narrative for the final conclusion',
    voice: 'Harmonious and narrative. Excels at summarizing progress and identifying convergence.'
  },
  Researcher: {
    name: 'Researcher',
    role: 'researcher',
    displayName: 'The Researcher',
    color: 'var(--agent-researcher)',
    tagline: 'Grounds in evidence',
    function: 'External knowledge validation and context grounding',
    roleDesc: 'Supplies citations, historical precedents, and scientific literature to anchor claims in evidence',
    voice: 'Informative and dense. Speaks in bibliographies and case studies.'
  },
  Operator: {
    name: 'Operator',
    role: 'operator',
    displayName: 'The Operator',
    color: 'var(--agent-operator)',
    tagline: 'Stress-tests execution',
    function: 'Translates theory into actionable, executable outputs',
    roleDesc: 'Handles formatting, implementation clarity, and practical execution planning',
    voice: 'Functional and direct. Prioritizes utility over philosophy.'
  }
}

// Ordered list — canonical deliberation sequence.
export const AGENT_LIST: AgentDef[] = [
  AGENTS.Strategist,
  AGENTS.Critic,
  AGENTS["Devil's Advocate"],
  AGENTS.Synthesizer,
  AGENTS.Researcher,
  AGENTS.Operator
]

// Ordered color array — use when you need colors by index (e.g. AIASphere in AIARing orbit).
export const AGENT_SPHERE_COLORS = AGENT_LIST.map((a) => a.color) as [string, string, string, string, string, string]

// Role-slug keyed color map — use when you have a slug from API responses or schemas.
export const AGENT_COLOR_BY_ROLE: Record<AgentRole | string, string> = Object.fromEntries(
  AGENT_LIST.map((a) => [a.role, a.color])
)

// Display-name keyed map — use when you have an agent name string from API/SSE messages.
// Typed as Record<string, ...> so runtime lookups don't require casts.
export const AGENT_THEME: Record<string, { color: string; label: string }> = Object.fromEntries(
  AGENT_LIST.map((a) => [a.name, { color: a.color, label: a.tagline }])
)
