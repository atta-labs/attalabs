// ============================================================================
// FILE 1: agent-theme.ts
// ============================================================================

export const AGENT_THEME: Record<string, { color: string; label: string }> = {
  Strategist: { color: 'hsl(119 21% 45%)', label: 'Maps the landscape' },
  Critic: { color: 'hsl(0 49% 57%)', label: "Finds what's wrong" },
  "Devil's Advocate": { color: 'hsl(278 35% 63%)', label: 'Challenges the frame' },
  Synthesizer: { color: 'hsl(43 52% 54%)', label: 'Draws threads together' },
  Researcher: { color: 'hsl(207 32% 52%)', label: 'Grounds in evidence' },
  Operator: { color: 'hsl(30 32% 52%)', label: 'Stress-tests execution' }
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
