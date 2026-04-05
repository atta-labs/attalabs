import type { SessionState, TerminalState } from './session'

export type SSEEvent =
  | { type: 'agent_start'; agent: string; round: number }
  | { type: 'agent_token'; agent: string; token: string }
  | { type: 'agent_complete'; agent: string; round: number; content: string }
  | { type: 'agent_error'; agent: string; error: string }
  | { type: 'round_complete'; round: number }
  | { type: 'loading_state'; message: string }
  | { type: 'conclusion_start' }
  | { type: 'conclusion_complete'; terminal_state: TerminalState }
  | { type: 'state_change'; state: SessionState }
  | { type: 'done' }
