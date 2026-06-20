# Tools / MCP Capability Spike — S0 Findings

**Iteration:** vada-production-v1 · **Task:** S0 · **Tier:** 0 · **Spike:** true  
**Status:** draft  
**Date:** 2026-06-20  
**Files read:** `adapter-langgraph/src/{llm,tools,custom-tool-loop,adapter,graph-builder,node-executor}.ts` · `engine/src/{flow-schema,flow-types,compile-flow,types}.ts` · `models/src/vendors.ts` · `agents/forensic-hiring-auditor/src/index.ts` + `yamls/herald-auditor.yaml`

---

## 1. In-process custom tools — per-vendor state

Custom tools = YAML `custom_tools: [...]` on an agent + matching `CustomToolHandlerMap` registered on the adapter at construction time. The loop lives in `custom-tool-loop.ts`; dispatch lives in `llm.ts`.

### Anthropic — **Fully working (D-047, Herald production)**

`runAnthropicCustomToolLoop` sends the merged tool list (server tools + custom tool specs) to `client.messages.create`, intercepts `tool_use` blocks, runs handlers concurrently, sends `tool_result` blocks back, and loops until `stop_reason !== 'tool_use'` or no registered handlers match. Gated by `resolveRegisteredCustomTools` — a pure predicate that is unit-tested.

Two guards:
- Incompatible with `outputSchema` — the gate function returns `[]` when `agent.outputSchema` is set (structured-output mode is incompatible with multi-turn today).
- Bounded at `MAX_CUSTOM_TOOL_ITERATIONS = 10`.

Herald's `SkepticalAuditor` + `fetch_github_signals` is the live production example (`packages/agents/forensic-hiring-auditor/`).

### Google (google-genai) — **Not supported. Zero infrastructure.**

`callGoogle()` calls `genAI.getGenerativeModel().generateContent(params.userPrompt)` with no `tools` parameter. The Google Generative AI SDK supports function calling via `tools: [{ functionDeclarations: [...] }]` and grounding via `tools: [{ googleSearch: {} }]` — neither is wired up.

A YAML `custom_tools` declaration on a Gemini agent: `resolveRegisteredCustomTools` would resolve the specs, but the dispatch switch never reaches the custom-tool loop for `google-genai` — `callGoogle()` ignores tools entirely.

### OpenAI-compat (openai, groq, xai, deepseek, cerebras, mistral, together, fireworks, ollama) — **Not supported. Zero infrastructure.**

`callOpenAICompat()` calls `client.chat.completions.create({ model, messages })` with no `tools` parameter. The OpenAI SDK supports function calling via `tools: [{ type: 'function', function: {...} }]` and processes `tool_calls` on `choices[0].message` — not wired.

A YAML `custom_tools` declaration on a GPT/Grok/Groq agent: silently dropped — the dispatch switch calls `callOpenAICompat()` which ignores tools entirely.

### Cognitive router interaction (all vendors)

`graph-builder.ts` identifies `toolEnabledNodes` by checking `agent.tools` (server tools), **not** `agent.customTools`. Custom-tool agents are invisible to the classifier and bypass the cognitive router entirely — correct behavior today since the classifier is Anthropic-only, but relevant when designing cross-vendor tool routing.

---

## 2. Per-vendor web search — native tool forwarding

"Server tools" = YAML `tools: [web_search]` entries resolved from a static per-vendor registry.

### Anthropic — **Working today for `web_search` and `web_fetch`**

`tools.ts` defines `ANTHROPIC_TOOL_REGISTRY`:

```ts
web_search: { type: 'web_search_20260209', name: 'web_search', allowed_callers: ['direct'] }
web_fetch:  { type: 'web_fetch_20260209', name: 'web_fetch',  allowed_callers: ['direct'] }
```

In `llm.ts` the Anthropic branch resolves `agent.tools` against this registry (lines 123–131), merges them into the tool list, and passes to `client.messages.create`. The cognitive router injects a Haiku classifier before tool-enabled nodes to dynamically allocate which tools are needed. Unknown tool names: warning logged, tool skipped — no throw.

### Google (Gemini) — **Not forwarded. No registry. No grounding wired.**

`callGoogle()` accepts no `tools` parameter. The Gemini API supports native grounding via `tools: [{ googleSearch: {} }]` — not exposed.

A YAML `tools: [web_search]` on a Gemini agent: `resolvedTools` is built from `ANTHROPIC_TOOL_REGISTRY` (an Anthropic-specific lookup) early in `llm.ts` but is **only consumed inside the Anthropic branch**. The Google branch never sees it, so the declaration is silently dropped.

**Missing:** a `GOOGLE_TOOL_REGISTRY` + forwarding `tools` into `callGoogle()` + response-side `FunctionCall` part handling.

### OpenAI (GPT / o-series) — **Not forwarded. No registry.**

`callOpenAICompat()` accepts no `tools` parameter. OpenAI's function calling API (`tools: [{ type: 'function', ... }]`) and `tool_calls` response fields are not wired.

**Missing:** an `OPENAI_COMPAT_TOOL_REGISTRY` + forwarding `tools` into `callOpenAICompat()` + response-side `tool_calls` handling.

### xAI (Grok) — **Not forwarded. No registry.**

Grok uses the openai-compat path (`baseURL: 'https://api.x.ai/v1'`). xAI's Live Search feature is not wired. Same gap as OpenAI-compat above.

### All other openai-compat vendors (Groq, DeepSeek, Mistral, Together, Fireworks, Ollama) — **Not forwarded.**

All share `callOpenAICompat()`. Tool forwarding gaps are identical to OpenAI. Not all of these vendors offer web-search tools, but function calling is possible on most.

---

## 3. External MCP servers — current state and requirements

### Current state: zero MCP infrastructure anywhere

- No `@modelcontextprotocol/sdk` (or equivalent) import in `packages/adapter-langgraph/`
- No `mcp_servers` field in `FlowAgentSchema` (`flow-schema.ts`) or `FlowAgent` (`flow-types.ts`)
- No `Agent.mcpServers` field in `@atta/agents`
- No MCP connection lifecycle (connect/disconnect) in `adapter.ts` or `node-executor.ts`
- No mechanism to fetch tool definitions from an MCP server and inject them as `CustomToolHandlerMap` entries

### What it would take (minimal wiring)

A "declare MCP servers in YAML, adapter handles them" feature requires changes across **5 packages** in dependency order:

**Step 1 — `@atta/agents`** (new type):
```ts
export interface McpServerSpec { url: string; name?: string }
// Add to Agent:
mcpServers?: McpServerSpec[]
```

**Step 2 — `@atta/engine` (`flow-schema.ts` + `flow-types.ts`)** (YAML-facing schema):
```ts
// flow-schema.ts — new Zod schema
const McpServerSpecSchema = z.object({ url: z.string().url(), name: z.string().optional() })
// Add to FlowAgentSchema:
mcp_servers: z.array(McpServerSpecSchema).optional()

// flow-types.ts — mirroring type
export interface FlowCustomMcpServerSpec { url: string; name?: string }
// Add to FlowAgent:
mcpServers?: FlowCustomMcpServerSpec[]
```

**Step 3 — `@atta/engine` (`compile-flow.ts`)**:  
`buildAgents()` must propagate `fa.mcpServers → agents[fa.name].mcpServers`.

**Step 4 — `@atta/adapter-langgraph` (`adapter.ts`)**:  
In `runExecution()`, before building the node executor:
1. Collect unique MCP server URLs from `plan.agents`
2. Connect MCP clients and fetch tool definitions via the MCP protocol
3. Translate MCP tool definitions into `CustomToolSpec` entries
4. Register proxy handlers (`CustomToolHandlerMap` entries that call `call_tool` on the MCP server)
5. Merge with any app-supplied `customToolHandlers`
6. Disconnect on completion/error

**Step 5 — `@atta/adapter-langgraph` (`llm.ts`)**:  
MCP-registered handlers slot into the existing `runAnthropicCustomToolLoop` for the Anthropic vendor — no loop changes needed for Anthropic. Non-Anthropic vendors require Tier A first (see §4).

**Open design questions (not resolved here — punt to T3 design):**
- Connection lifecycle: per-execution connect/disconnect vs long-lived per-adapter instance
- Authentication: bearer token, API key header, mTLS — needs a field on `McpServerSpec`
- Cross-vendor MCP: the custom tool loop is currently Anthropic-only; MCP on Google/OpenAI vendors requires Tier A (per-vendor loop) first

---

## ⚠️ STOP-AND-ESCALATE: MCP requires a new `@atta/engine` flow-schema field

MCP server support is **not** a pure adapter-layer change. It requires a new field on `FlowAgentSchema` in `@atta/engine`, which has blast radius across every product that compiles Flows:

| Package | Change |
|---------|--------|
| `@atta/agents` | New `McpServerSpec` type + `Agent.mcpServers?` |
| `@atta/engine` | `FlowAgentSchema` (Zod) + `FlowAgent` (TypeScript) + `compile-flow.ts` `buildAgents()` |
| `@atta/adapter-langgraph` | MCP client + lifecycle management + handler registration |
| `apps/vada-ai` | YAML authoring skill update; any Vāda YAML using MCP tools |
| `packages/agents/forensic-hiring-auditor` | Could eventually replace `customTools` with MCP declaration |

This resizes T3. The decision about whether MCP is in-scope for T3 vs a follow-on task must be made by the Principal before T3 begins.

---

## 4. Recommended substrate approach for T3

### Option A — Server tool forwarding (no engine schema changes)

Entirely contained in `adapter-langgraph/src/{tools,llm}.ts`. Adds per-vendor tool registries using the same logical tool names, enabling `tools: [web_search]` in any YAML to dispatch to the correct vendor-native API:

1. Add `GOOGLE_TOOL_REGISTRY` in `tools.ts`: `web_search → { googleSearch: {} }` (Gemini grounding)
2. Add `OPENAI_COMPAT_TOOL_REGISTRY` in `tools.ts`: `web_search → { type: 'function', function: { name: 'web_search', ... } }`
3. Update `callGoogle()`: accept `tools?` param, pass grounding config, handle `FunctionCall` parts in response
4. Update `callOpenAICompat()`: accept `tools?` param, pass tool list, handle `tool_calls` on `choices[0].message`
5. In `llm.ts` dispatch: resolve tools against the correct registry per `vendor.sdkShape` before the branch switch

This is a **pure adapter change**. The YAML schema does not change. The cognitive router only needs to become aware of tool-enabled nodes for non-Anthropic vendors if you want dynamic tool allocation — can be deferred.

**Effort:** ~2 days. **Engine schema change:** none.

### Option B — Custom tool loop for OpenAI-compat (no engine schema changes)

Adds `runOpenAICompatCustomToolLoop` mirroring the Anthropic loop but using OpenAI's `tool_calls` / `tool_results` message format. Enables Herald-style `custom_tools` declarations on GPT/Grok/Groq agents.

**Effort:** +1 day on top of Option A. **Engine schema change:** none.

### Option C — MCP server support (requires engine schema change)

See §3. Requires new `mcp_servers` field in the engine flow-schema, `@atta/agents`, `compile-flow.ts`, and the adapter's execution path.

**Effort:** +3–4 days. **Engine schema change: YES.** Blast radius: Vāda + Herald.

---

### Recommendation

**Option A + B for T3. Treat MCP (Option C) as a separate task.**

The custom tool loop for OpenAI-compat (Option B) is a contained adapter change that doubles Herald's vendor coverage for the `fetch_github_signals` pattern and is mechanically straightforward. Both A and B have no engine schema impact and no blast radius beyond `@atta/adapter-langgraph`.

MCP (Option C) should wait until the Principal decides:
1. Whether T3's scope includes engine schema changes
2. What `McpServerSpec` authentication and lifecycle model should be
3. Whether Herald or Vāda has a concrete MCP server in mind (the design is easier with a target)

| Option | Engine schema change? | Vendors unlocked | Effort |
|--------|----------------------|-----------------|--------|
| A: Server tool forwarding | No | Gemini grounding + OpenAI/Grok web search | ~2d |
| B: + OpenAI-compat custom tool loop | No | GPT/Grok custom tools (Herald parity) | +1d |
| C: + MCP server support | **Yes** | Any MCP server (any vendor via Option B) | +3–4d |
