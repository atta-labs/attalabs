/**
 * TypeScript types for the v2 universal round-based Flow schema.
 * Independent from spec-types.ts — no import dependency in either direction.
 * These are the canonical camelCase types; the Zod schema in flow-schema.ts
 * validates the snake_case YAML shape.
 */

export type SignalType = 'contains' | 'equals' | 'matches'
export type RoundLayout = 'parallel' | 'serial'
export type AgentFailurePolicy = 'abort' | 'continue'
export type OnFailureAction = 'abort' | 'continue' | 'revise'

// Redeclared independently from spec-types.ts to avoid cross-dependency.
// Identical value set; PR 2 deletes spec-types.ts cleanly without touching this file.
export type FlowClassifierMode = 'auto' | 'skip' | 'always_tools'

export interface FailureSignal {
  type: SignalType
  value: string
  caseSensitive?: boolean
}

export interface OnFailureSpec {
  action: OnFailureAction
  target?: string
  maxRevisions?: number
  signal: FailureSignal
}

export interface AgentInRound {
  name: string
  messageTemplate?: string
}

export interface Round {
  id: string
  name: string
  agents: AgentInRound[]
  layout: RoundLayout
  repeats?: number
  messageTemplate?: string
  agentFailure?: AgentFailurePolicy
  onFailure?: OnFailureSpec
}

/**
 * Specification for a client-side custom tool declared on a FlowAgent.
 *
 * Mirrors the @atta/agents CustomToolSpec — kept here so the engine type
 * surface is self-contained for YAML loading and validation. Absent on every
 * legacy spec → no behavior change.
 */
export interface FlowCustomToolSpec {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface FlowAgent {
  name: string
  description?: string
  systemPrompt: string
  model?: string
  maxTokens?: number
  tools?: string[]
  customTools?: FlowCustomToolSpec[]
  outputFormat?: 'text' | 'structured'
  outputSchema?: Record<string, unknown>
  classifier?: {
    mode: FlowClassifierMode
    budget?: number
  }
  editable?: boolean
  role?: string
}

export interface FlowDefaults {
  model: string
  maxTokens?: number
}

export interface Flow {
  schemaVersion: '2.0'
  id: string
  displayName: string
  description: string
  experimental: boolean
  benchmarked: boolean
  defaults: FlowDefaults
  agents: FlowAgent[]
  rounds: Round[]
}
