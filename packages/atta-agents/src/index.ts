/** Generic agent identity types — shared across all Atta AI products. */

/**
 * Specification for a client-side custom tool the agent may invoke.
 *
 * Custom tools are app-supplied async functions executed by the adapter
 * during a multi-turn LLM loop. The spec (name + description + parameters)
 * is declared in YAML on the agent; the implementation (the handler) is
 * registered server-side on the adapter at construction time.
 *
 * Distinct from server-managed tools (e.g. web_search) which Anthropic
 * executes inside its API. Custom tools are sent to the model as `tools`
 * but their `tool_use` blocks are intercepted by the adapter and routed
 * to the registered handler.
 *
 * Additive surface: if no agent declares customTools, no behavior changes.
 */
export interface CustomToolSpec {
  /** Tool name the model emits in tool_use blocks. Must be unique within the agent. */
  name: string
  /** Human-readable description the model uses to decide when to call the tool. */
  description: string
  /** JSON Schema for the tool's input arguments — matches Anthropic input_schema. */
  parameters: Record<string, unknown>
}

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
  /**
   * Optional client-side custom tool specifications. When present, the adapter
   * runs a multi-turn loop that pauses on tool_use, invokes the registered
   * handler for each named tool, and feeds tool_result back to the model.
   *
   * Absent today on every Vāda agent → execution path is unchanged.
   */
  customTools?: CustomToolSpec[]
  /** Model override for this agent. Falls back to the team/experiment-level model if unset. */
  model?: string
  /** JSON Schema for structured output. When set, the adapter must enforce structured responses. */
  outputSchema?: Record<string, unknown>
}
