/** Generic agent identity types — shared across all Atta AI products. */

/** A role slug identifying an agent's deliberative function. */
export type AgentRole = string

/**
 * A single AI agent definition — the atomic unit of the Vāda engine.
 *
 * Naming: PascalCase, descriptive of function, never version-suffixed.
 */
export interface Agent {
  /** PascalCase functional name — stable identifier used as key in Plan.agents. */
  name: string
  /** Human-readable description of the agent's role in the deliberation. */
  description: string
  /**
   * System prompt passed to the LLM. Zero content injection: the engine never
   * modifies this string.
   */
  systemPrompt: string
  /** Optional tool names the agent may invoke. Tool implementations are adapter-managed. */
  tools?: string[]
  /** Model override for this agent. Falls back to the team/experiment-level model if unset. */
  model?: string
  /** JSON Schema for structured output. When set, the adapter must enforce structured responses. */
  outputSchema?: Record<string, unknown>
}
