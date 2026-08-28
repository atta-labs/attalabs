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
  /** A rounds-shaped Flow never carries steps — see StepsFlow and the rounds/steps XOR. */
  steps?: never
}

/**
 * Declares a role an agent-spawn step may launch as. Carries only the
 * identifier the step references — no model, prompt, or tool fields; those
 * belong to the step itself or to the executor that binds the role to a
 * binary (a later task).
 */
export interface AgentRole {
  role: string
}

/**
 * A step that spawns an external coding agent. Fields describe how to
 * launch it (role, permission scope, working directory, turn ceiling,
 * prior session to resume) — never what it may do once running. No
 * binary name, no tool bindings: the executor (a later task) binds
 * `role` to a binary, since the binary present on one machine may be
 * absent on another.
 */
export interface AgentStep {
  id: string
  type: 'agent'
  role: string
  promptTemplate: string
  permission: string
  workingDirectory: string
  maxTurns: number
  resume?: string
}

/** A step describing an external action with no model turn. */
export interface MechanicalStep {
  id: string
  type: 'mechanical'
  action: string
}

export type Step = AgentStep | MechanicalStep

export interface StepsFlow {
  schemaVersion: '2.0'
  id: string
  displayName: string
  description: string
  experimental: boolean
  benchmarked: boolean
  defaults: FlowDefaults
  agents: AgentRole[]
  steps: Step[]
  /** A steps-shaped Flow never carries rounds — see Flow and the rounds/steps XOR. */
  rounds?: never
}

/**
 * A Flow carries `rounds` XOR `steps`, never both. `Flow` (rounds-shaped)
 * keeps its existing name and shape unchanged for every current consumer;
 * `AnyFlow` is the union new code (the loader, validation, tests) uses to
 * express "either shape."
 */
export type AnyFlow = Flow | StepsFlow
