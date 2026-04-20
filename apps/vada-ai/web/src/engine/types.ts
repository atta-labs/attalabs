import type { RouteProvider } from '@atta/models'
import type { ConclusionPhase } from '@atta/orchestration'
import type { SessionState, TerminalState } from '@/schemas'

export interface ModelRef {
  provider: RouteProvider
  modelId: string
}

export interface RunAgentCommand {
  type: 'run_agent'
  turnId: string
  agent: string
  round: number
  model: ModelRef
  systemPrompt: string
  userPrompt: string
}

export type { ConclusionPhase }

export interface RunConclusionCommand {
  type: 'run_conclusion'
  turnId: string
  phase: ConclusionPhase
  model: ModelRef
  systemPrompt: string
  userPrompt: string
  expected: 'json' | 'verdict'
}

export interface StateChangeCommand {
  type: 'state_change'
  state: SessionState
}

export interface TerminalCommand {
  type: 'terminal'
  terminal_state: TerminalState
}

export interface DoneCommand {
  type: 'done'
}

export type NextCommand = RunAgentCommand | RunConclusionCommand | StateChangeCommand | TerminalCommand | DoneCommand

export type TurnPhase = 'run_agent' | ConclusionPhase

export interface TurnPayload {
  turnId: string
  content: string
  phase: TurnPhase
  agent?: string
  round?: number
  tokensInput?: number | null
  tokensOutput?: number | null
  elapsedMs?: number
}

export interface TurnErrorPayload {
  turnId: string
  error: string
}
