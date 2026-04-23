import type { AgentName, AgentRole } from '@vada/agents'
import type { RouteProvider } from '@atta/models'

// ── Context ──────────────────────────────────────────────────────────────────
// All per-request state for one deliberation turn. Passed by the app after
// unlocking the API key from @atta/identity. Neither this type nor any consumer
// of it should import from @mastra/*.

export interface DeliberationContext {
  provider: RouteProvider
  modelId: string
  apiKey?: string // undefined = keyless provider (Ollama)
  question: string
  round: number
  hasWhispers: boolean
}

// ── Tool ─────────────────────────────────────────────────────────────────────
// Opaque for V1. Fields will be added deliberately when Step 8 wires MCP.
// The brand prevents consumers from constructing invalid tool objects.

export interface DeliberationTool {
  readonly _brand: 'DeliberationTool'
}

// ── Agent ─────────────────────────────────────────────────────────────────────

export interface DeliberationAgent {
  role: AgentRole
  name: AgentName
  instructions: (ctx: DeliberationContext) => string
  tools?: readonly DeliberationTool[]
}

// ── Result ────────────────────────────────────────────────────────────────────

export interface DeliberationResult {
  text: string
  finishReason: string
  usage: {
    inputTokens: number | undefined
    outputTokens: number | undefined
  }
}
