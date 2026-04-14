// Agent color + label definitions — single source of truth for the whole app.
// All color values reference CSS variables defined in packages/ui/styles/globals.css.

// Display-name keyed — use when you have the agent's full name (e.g. from SSE messages).
export const AGENT_THEME: Record<string, { color: string; label: string }> = {
  Strategist: { color: 'var(--agent-strategist)', label: 'Maps the landscape' },
  Critic: { color: 'var(--agent-critic)', label: "Finds what's wrong" },
  "Devil's Advocate": { color: 'var(--agent-devils-advocate)', label: 'Challenges the frame' },
  Synthesizer: { color: 'var(--agent-synthesizer)', label: 'Draws threads together' },
  Researcher: { color: 'var(--agent-researcher)', label: 'Grounds in evidence' },
  Operator: { color: 'var(--agent-operator)', label: 'Stress-tests execution' }
}

// Role-slug keyed — use when you have a role slug (e.g. from schemas, agents page).
export const AGENT_COLOR_BY_ROLE: Record<string, string> = {
  strategist: 'var(--agent-strategist)',
  critic: 'var(--agent-critic)',
  devils_advocate: 'var(--agent-devils-advocate)',
  synthesizer: 'var(--agent-synthesizer)',
  researcher: 'var(--agent-researcher)',
  operator: 'var(--agent-operator)'
}

// Ordered array — use when you need colors by index (e.g. AIASphere in AIARing orbit).
// Order matches canonical deliberation order: Strategist → Critic → Devil's Advocate → Synthesizer → Researcher → Operator.
export const AGENT_SPHERE_COLORS = [
  'var(--agent-strategist)',
  'var(--agent-critic)',
  'var(--agent-devils-advocate)',
  'var(--agent-synthesizer)',
  'var(--agent-researcher)',
  'var(--agent-operator)'
] as const
