# 01 — Architecture

## Component overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER'S CHAT CLIENT                                                  │
│  (Claude Desktop / Cursor / Claude.ai web / Claude Code)             │
│                                                                      │
│  User ↔ Caller Claude (the Claude instance the user is chatting)     │
└────────────────────────────────────┬────────────────────────────────┘
                                     │
                   MCP stdio or HTTP │ (tool call: vada__consult)
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VĀDA MCP SERVER                                                     │
│  apps/vada-ai/mcp-server/ (package: @vada/mcp-server)                │
│                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐   │
│  │ Tool handler         │    │ DeliberationSpec (inline or YAML)│   │
│  │ vada__consult        │───▶│ built from reviewer specs        │   │
│  │                      │    │ Strategist + Critic + DA         │   │
│  │ brief + reviewers[]  │    │ (brokered-trio-v1.yaml or inline)│   │
│  └──────────┬───────────┘    └──────────────────────────────────┘   │
│             │                                                        │
│             │ compileSpec(spec, brief) → Plan                        │
│             ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ @atta/engine                                                  │   │
│  │ compileBrokered() produces a sequential Plan:                 │   │
│  │ __start__ → reviewer-0 → reviewer-1 → ... → reviewer-N-1      │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │ Plan                                                   │
│             ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ @atta/adapter-langgraph                                       │   │
│  │ LangGraphAdapter.execute(plan, apiKey)                        │   │
│  │ - Builds LangGraph StateGraph from Plan                       │   │
│  │ - Executes reviewers sequentially (V1)                        │   │
│  │ - onNodeComplete hook per reviewer                            │   │
│  │ - Assembles Conclusion from transcript                        │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │ Conclusion                                             │
│             ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Response assembly in tool handler                             │   │
│  │ - Each reviewer turn → responses[] entry                      │   │
│  │ - Session record written via @atta/db                         │   │
│  │ - Conclusion.content assembled from reviewer outputs          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                     │
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VĀDA WEB DASHBOARD (vada.ai)                                        │
│  apps/vada-ai/web/                                                   │
│                                                                      │
│  /brokered/consultations — list of past Brokered sessions           │
│  /brokered/consultations/[id] — detail view of one session          │
│                                                                      │
│  Read-only for V1.                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data flow

### Step-by-step sequence for a single Brokered deliberation

1. **User talks to Caller Claude** in their chat client. Normal conversation.

2. **Caller Claude recognizes deliberation-worthy moment** — either user explicitly asked, or the conversation reached a complexity threshold where multiple perspectives add value.

3. **Caller Claude asks user permission** (unless user already explicitly requested). Example: "This feels like a decision where multiple perspectives would help. Want me to bring in Vāda reviewers?" User says yes/no.

4. **Caller Claude writes the brief** — a self-contained description including: context, question, current leaning (if any), stakes, and per-reviewer notes. Follows brief-writing guidance from document 04.

5. **Caller Claude invokes `vada__consult`** with the brief and selected reviewer personas. Typically 2-3 reviewers.

6. **Vāda MCP server receives the tool call.** Tool handler validates input. Writes initial session record.

7. **Tool handler compiles a Plan** via `@atta/engine.compileSpec()` using an inline `DeliberationSpec` built from the requested reviewers (or a registered YAML spec via `lookupSpec`). The compiled Plan is a sequential graph: `__start__ → reviewer-0 → reviewer-1 → ... → reviewer-N-1`.

8. **LangGraphAdapter executes the Plan.** Each reviewer node runs in sequence. Each reviewer receives the brief via the workflow's `messageTemplate`. The adapter invokes the configured LLM provider (via `@atta/models`) per reviewer and emits `onNodeComplete` hooks.

9. **Adapter assembles the Conclusion.** After the last reviewer completes, `buildSuccessfulConclusion` takes the Brokered-specific branch: no terminal synthesizer node exists, so `terminalState = 'CLEAN'` and `content` is built from the concatenated reviewer outputs with agent names as section headers.

10. **Tool handler builds the response.** Transcript entries become `responses[]` in the tool return value. Session record updated with final state, cost, duration.

11. **Tool returns to Caller Claude.** Caller Claude receives structured data: `brief`, per-reviewer `responses[]`, session metadata.

12. **Caller Claude synthesizes.** Maps convergence, divergence, flags its own position if different. Produces a summary for the user.

13. **Caller Claude presents to user.** Proposes next steps or asks for direction. User retains final decision.

14. **(Optional) User views session detail** at `/brokered/consultations/[id]` later for reference.

---

## Trust boundaries and data flow

### What crosses the MCP boundary

**From Caller Claude to Vāda MCP:**
- The user-provided question/context (in the brief)
- Per-reviewer notes (what Caller Claude wants each reviewer to focus on)
- Reviewer persona selection (which team / which reviewers to invoke)

**From Vāda MCP to Caller Claude:**
- Per-reviewer responses extracted from the transcript
- Per-reviewer metadata (latency, model used, token count, cost)
- Session ID and session URL (for dashboard reference)

### What Vāda MCP stores

- Session record with timestamp, user ID (from Clerk), brief, responses, metadata
- Stored in Postgres `mcp_sessions` table via `@atta/db`
- Scoped to the user's account for dashboard viewing
- Used for audit and dashboard only, not runtime logic

### What Vāda MCP does NOT store

- The ongoing user/Caller-Claude conversation (not shared across MCP boundary)
- API keys provided to reviewer LLMs (used in-memory per call, never persisted)
- Intermediate reasoning within reviewer responses beyond what they return

---

## Deployment topology

### V1: Local stdio installation (Claude Desktop / Cursor / Claude Code)

```
User's machine:
  Claude Desktop reads ~/Library/Application Support/Claude/claude_desktop_config.json
  Config points to Vāda MCP script:
    command: /path/to/bun
    args: [run, /path/to/apps/vada-ai/mcp-server/src/index.ts]
    env: { ANTHROPIC_API_KEY, DATABASE_URL, VADA_USER_ID }
  
  Claude Desktop spawns Vāda MCP as subprocess via stdio.
  Vāda MCP connects to remote Neon Postgres.
  Reviewer LLM calls go to configured providers via @atta/models.
```

- User's machine has local bun + the Vāda source code
- API keys stored in local config file, never sent to Vāda's servers
- DB connection is to Neon Postgres (shared with web app for session visibility)

### V2: Remote HTTP for claude.ai (deferred)

Same pattern but via HTTPS transport with OAuth-based user identification. Deferred until V1 validates the product.

---

## Integration with existing Vāda infrastructure

Brokered reuses existing Vāda packages:

- **`@atta/engine`** — `loadSpec` + `compileSpec` converts a `DeliberationSpec` (from YAML or built inline) into a sequential Plan. Same engine that handles Crucible and Sparring via their respective YAML specs.
- **`@atta/adapter-langgraph`** — executes the compiled Plan via LangGraph. The adapter assembles a Conclusion from reviewer outputs; Brokered specs use `response.mode: concatenate`, so no terminal synthesizer is needed.
- **`@atta/models`** — routes each reviewer's LLM call to the correct provider (Anthropic, Google, Groq, OpenAI).
- **`@atta/db`** — session persistence via Drizzle + Neon Postgres.
- **`@atta/auth`** — Clerk user ID for session scoping.
- **`@vada/agents`** — reviewer agent definitions (Strategist, Critic, Devil's Advocate) with system prompts and metadata. Used by `consult.ts` directly.
- **`packages/agents/vada-deliberation/yamls/`** — YAML specs (`brokered-trio-v1.yaml`, `brokered-quartet-v1.yaml`). Replaced `@vada/teams` (deleted).
- **`@vada/mcp-server`** — MCP tool handlers that wire the above together.

Brokered does NOT use (V1):
- Parallel fan-out. Sequential execution only. Parallel support is Phase 4.5.
- Synthesis agent. No Vāda-side synthesis; Caller Claude synthesizes with conversation context.
- Audit phase. Brokered has no audit node.
- Revision loops. Brokered has no revisions.

---

## Brokered spec contract

Brokered deliberations use the `reviewers` section of a `DeliberationSpec` (YAML schema v1.0):

```yaml
reviewers:
  - agent: Strategist
    message_template: "{{question}}"
  - agent: Critic
    message_template: "{{question}}"
  - agent: "Devil's Advocate"
    message_template: "{{question}}"

response:
  mode: concatenate
  format: "## {agent_name}\n\n{content}\n\n---\n\n"
```

`compileSpec` maps this to a sequential Plan: `__start__ → reviewer-0 → reviewer-1 → ... → reviewer-N-1`.

`response.mode: concatenate` instructs the adapter to concatenate reviewer outputs. No terminal synthesizer node is needed.

For the inline path in `consult.ts`, the `DeliberationSpec` is constructed programmatically from the reviewer specs at runtime.

---

## Failure modes and handling

**Reviewer timeout:** Adapter timeout (default 300s) applies per plan. If a reviewer hangs, the whole plan times out. For V1, acceptable — sequential execution means we're not juggling parallel timeouts.

**LLM provider error:** Propagates up from the adapter. Plan execution fails with error. Tool handler returns error response. Session record updated with failure status.

**Database write failure:** Log but do not fail the plan execution. Reviewer responses still return to Caller Claude. Session record is best-effort.

**Invalid brief / team:** Validation errors from `@atta/engine.validateWorkflow` or `validateTeam` are returned to the tool caller as structured errors.

**Partial failure:** V1 does not support partial success. The whole plan either completes or fails. Proper partial failure handling (one reviewer fails, others succeed) is future work tied to parallel execution.

---

## Security considerations

**Reviewer prompts can't be user-injected.** The `messageTemplate` is defined in the team config. User briefs are passed as template variables, not as system prompts.

**Cross-user isolation.** Sessions are tagged with Clerk user ID. Dashboard queries filter by user.

**API key handling.** In V1, keys live in local MCP config. Read via env, passed to provider clients, never persisted.

---

## Observability

**Langfuse traces** for every Brokered call — inherits from the engine's standard instrumentation:
- Parent span: the adapter execution
- Child spans: one per reviewer node
- Metadata: user ID, model, tokens, costs

**Postgres session table** as the durable record:
- `mcp_sessions.tool_name = 'vada__consult'` filters Brokered sessions
- `transcript` column stores the brief + reviewer outputs
- `user_id`, `created_at`, `tool_name`, `cost_cents`, `duration_ms` for analytics

---

## Known limitations in V1

- **Sequential-only execution** — 2-5 reviewers run one after another. A 3-reviewer deliberation takes 3x one reviewer's time. Parallel fan-out deferred to Phase 4.5.
- **MCP-only** — Brokered does not run through the web UI's `/deliberate` route. The web app's session state machine (`PENDING → ROUND_1 → ... → TERMINAL`) is rounds-shaped and doesn't fit Brokered cleanly. Web integration deferred until a DB schema update adds a `BROKERED_RUNNING` state or equivalent.
- **No partial failure handling** — tied to parallel execution work.
- **Synthesis not implemented** — `synthesisAgent` reserved in the type but ignored at compile time. Caller Claude synthesizes externally.

These are all acceptable for V1. Each has a clear upgrade path when user signal justifies the work.
