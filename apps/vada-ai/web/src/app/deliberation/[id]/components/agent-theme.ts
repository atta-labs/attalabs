// Deliberation-specific constants. Agent definitions live in @/lib/agent-theme.
export { AGENT_THEME, AGENT_COLOR_BY_ROLE, AGENT_SPHERE_COLORS } from '@/lib/agent-theme'

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

export const ROUND_DESCRIPTIONS: Record<number, string> = {
  1: 'Each agent opens independently.',
  2: 'Agents challenge each other directly.',
  3: 'Agents move toward shared ground.'
}
