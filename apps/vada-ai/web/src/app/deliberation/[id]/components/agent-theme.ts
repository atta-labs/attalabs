// ============================================================================
// FILE 1: agent-theme.ts
// ============================================================================

// Agent colors — single source of truth. All values reference CSS variables
// defined in packages/ui/styles/globals.css under :root { --agent-* }.
// Use AGENT_THEME for display-name keyed access, AGENT_COLOR_BY_ROLE for role-key access.
export const AGENT_THEME: Record<string, { color: string; label: string }> = {
  Strategist: { color: 'var(--agent-strategist)', label: 'Maps the landscape' },
  Critic: { color: 'var(--agent-critic)', label: "Finds what's wrong" },
  "Devil's Advocate": { color: 'var(--agent-devils-advocate)', label: 'Challenges the frame' },
  Synthesizer: { color: 'var(--agent-synthesizer)', label: 'Draws threads together' },
  Researcher: { color: 'var(--agent-researcher)', label: 'Grounds in evidence' },
  Operator: { color: 'var(--agent-operator)', label: 'Stress-tests execution' }
}

// Role-key access — use this when you have a role slug (e.g. from the agents page).
export const AGENT_COLOR_BY_ROLE: Record<string, string> = {
  strategist: 'var(--agent-strategist)',
  critic: 'var(--agent-critic)',
  devils_advocate: 'var(--agent-devils-advocate)',
  synthesizer: 'var(--agent-synthesizer)',
  researcher: 'var(--agent-researcher)',
  operator: 'var(--agent-operator)'
}

export const ROUND_TITLES: Record<number, string> = {
  1: 'Initial Positions',
  2: 'Adversarial Collision',
  3: 'Convergence'
}

export type TerminalStateKey = 'CLEAN' | 'REVISED' | 'UNCONVERGED'

export const TERMINAL_BADGE: Record<TerminalStateKey, { label: string; className: string }> = {
  CLEAN: { label: 'Clean', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  REVISED: { label: 'Revised', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  UNCONVERGED: { label: 'Unconverged', className: 'bg-destructive/10 text-destructive border-destructive/20' }
}
