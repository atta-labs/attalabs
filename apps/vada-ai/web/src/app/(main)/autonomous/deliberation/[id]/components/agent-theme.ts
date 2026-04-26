// Deliberation-specific constants. Agent definitions live in @vada/agent-metadata.
export { AGENT_THEME, AGENT_COLOR_BY_ROLE, AGENT_SPHERE_COLORS } from '@vada/agent-metadata'

export const ROUND_TITLES: Record<number, string> = {
  1: 'Initial Positions',
  2: 'Adversarial Collision',
  3: 'Convergence'
}

export type TerminalStateKey = 'CLEAN' | 'REVISED' | 'UNCONVERGED' | 'ERROR'

export const TERMINAL_BADGE: Record<TerminalStateKey, { label: string; className: string }> = {
  CLEAN: { label: 'Clean', className: 'bg-success/10 text-success border-success/20' },
  REVISED: { label: 'Revised', className: 'bg-warning/10 text-warning border-warning/20' },
  UNCONVERGED: { label: 'Unconverged', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  ERROR: { label: 'Error', className: 'bg-destructive/10 text-destructive border-destructive/20' }
}

export const ROUND_DESCRIPTIONS: Record<number, string> = {
  1: 'Each agent opens independently.',
  2: 'Agents challenge each other directly.',
  3: 'Agents move toward shared ground.'
}
