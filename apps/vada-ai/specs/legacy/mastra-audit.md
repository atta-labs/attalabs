# Mastra Usage Audit — Phase 2 Task 1

Status: retired

**Date:** April 22, 2026
**Purpose:** Inventory what Mastra features the current Vāda code uses to inform the LangGraph adapter implementation in Phase 2 Task 2.

---

## 1. Mastra packages imported

| Package | Files importing it | Purpose |
|---------|-------------------|---------|
| `@mastra/core` | `apps/vada-ai/web/src/mastra/index.ts` | Main Mastra instance initialization |
| `@mastra/core/workflows` | `apps/vada-ai/web/src/engine/workflow/crucible-workflow.ts`, `steps.ts` | Workflow definition and step execution |
| `@mastra/observability` | `apps/vada-ai/web/src/mastra/index.ts` | Tracing and sensitive data filtering |
| `@mastra/langfuse` | `apps/vada-ai/web/src/mastra/index.ts` | LangFuse exporter for observability |

---

## 2. Mastra primitives used

### Mastra (root instance)
- **Usage count:** 1 location
- **Files:** `apps/vada-ai/web/src/mastra/index.ts`
- **Purpose in Vāda:** Container for workflows and observability config. Created once and exported for use in the `/api/deliberation/[id]/workflow/run` route.
- **LangGraph equivalent:** StateGraph (per workflow) + LangSmith for observability (Phase 2 Task 10)
- **Code pattern:** `new Mastra({ workflows: { crucible: crucibleWorkflow }, observability })`

### Workflow (createWorkflow)
- **Usage count:** 1 workflow definition
- **Files:** `apps/vada-ai/web/src/engine/workflow/crucible-workflow.ts`
- **Purpose in Vāda:** Defines the orchestration DAG — 13 sequential steps (3 rounds × 4 agents + 3 conclusion steps) with one conditional branch (pass vs revise).
- **Structure:**
  - Round 1: Strategist → Critic → Devil's Advocate → Synthesizer
  - Round 2: (same 4 agents)
  - Round 3: (same 4 agents)
  - Conclusion synthesis
  - Conclusion audit (Blind Critic)
  - Branch: if PASS → end; else → revise + re-audit → end
- **LangGraph equivalent:** StateGraph with `.add_node()` and `.add_edge()` for sequential flow, `.add_conditional_edges()` for the branch
- **Code pattern:** `createWorkflow(...).then(step1).then(step2)...branch([...]).commit()`

### Step (workflow steps)
- **Usage count:** 13 steps
- **Files:** `apps/vada-ai/web/src/engine/workflow/steps.ts`
- **Step types:**
  - 12 agent turn steps (each executes an agent, calls LLM via `@atta/orchestration`, persists transcript)
  - 1 audit step (Blind Critic evaluates conclusion)
  - NOTE: Pass/Revise branches are handled as conditional step transitions, not separate step types
- **Purpose in Vāda:** Each step is an async function that:
  1. Loads the session from DB
  2. Calls `getNextCommand()` to determine which agent should run next
  3. Calls `executeAgentTurn()` to invoke the LLM with the agent's system prompt
  4. Calls `persistTurn()` to write the turn to the DB
  5. Returns `{ ok: true }` or the audit verdict
- **LangGraph equivalent:** Custom node functions (Python/JS) that execute the same logic
- **Code pattern:** `Step<InputType, unknown, InputSchema, OutputSchema>` with async execute function

### Observability / Tracing
- **Usage count:** Optional (only if LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY env vars are set)
- **Files:** `apps/vada-ai/web/src/mastra/index.ts`
- **Features used:**
  - `Observability` class with exporters array
  - `LangfuseExporter` for sending spans to LangFuse
  - `SensitiveDataFilter` to redact sensitive fields (apiKey, token, cookie, etc.) from spans
- **Vāda-specific config:** Filters out Clerk session tokens and per-agent API keys from observability data
- **LangGraph equivalent:** LangSmith integration via `@langchain/langgraph`; redaction via custom callback
- **Phase:** Phase 2 Task 10 (LangSmith integration)

---

## 3. V1 Crucible orchestration

**Current structure (V1 — Mastra-based):**
- **Entry:** `apps/vada-ai/web/src/api/deliberation/[id]/workflow/run` POST route
- **Workflow trigger:** Calls `mastra.getWorkflow('crucible').createRun()` and `run.start({ inputData: { sessionId, apiKey } })`
- **Round sequencing:** Hardcoded in `crucibleWorkflow` — `.then()` chain for 3 rounds × 4 agents
- **Blind Critic audit:** `conclusionAuditStep` executes after synthesis; verdict determines revision path
- **Revision loop:** If audit rejects, `conclusionReviseReauditStep` re-runs synthesis + re-audit
- **State machine:** `getNextCommand()` in `steps.ts` reads the DB and decides which agent should run next based on session state
- **Lines of code:** ~400 lines in workflow + steps files

**New structure (Phase 2 — Engine + LangGraph adapter):**
- **Entry:** User calls `engine.compile(team, question, model)` → returns `Plan` (DAG of nodes)
- **Adapter execution:** Adapter calls `adapter.execute(plan)` → streams SSE events
- **Round sequencing:** No longer hardcoded in Mastra; now declarative in Team config → compile() generates Plan
- **Blind Critic audit:** Defined in Team's auditAgent + conditional edges in Plan
- **Revision loop:** Handled by Plan's pre-allocated revision nodes + adapter's conditional edge logic
- **State machine:** Simplified — adapter reads ExecutionState and calls next node, no imperative state transitions
- **Migration:** The imperative Mastra workflow becomes declarative Vāda Team config + engine-generated Plan

**Impact:** V1 Crucible logic (agent sequencing, audit branching, revision handling) is now part of the engine's deterministic compilation. The adapter is a dumb runtime executor.

---

## 4. Memory / state features

**Mastra memory:** NOT USED
- Vāda does not use Mastra's Memory system (sessions, retrieval, persistent context)
- State is managed entirely by the web app's PostgreSQL database (`session`, `transcriptEntry` tables)
- Each step loads the fresh session state from DB before executing

**Implication:** LangGraph adapter does not need to replicate Mastra's memory system. Session state lives in DB; the plan executor reads it between steps.

---

## 5. Tools and integrations

**Mastra tools:** NOT USED
- Vāda agents do not use Mastra's Tool abstraction
- All agent turns are pure LLM calls (no tool use, function calling, or external integrations)
- Web search, code execution, etc. are out of scope for V1

**LangfuseExporter:** USED (optional)
- Configured for observability; not critical to core Vāda logic
- Handled separately in Phase 2 Task 10

---

## 6. Features for LangGraph adapter

The adapter must replicate these Mastra features:

| Mastra feature | LangGraph equivalent | Mapping | Notes |
|---------------|---------------------|---------|-------|
| Workflow DAG (sequential + branching) | StateGraph with `.add_edge()` and `.add_conditional_edges()` | Direct 1:1 | Plan is a DAG; adapter builds StateGraph from Plan nodes/edges |
| Step execution (async functions) | StateGraph node functions | Direct 1:1 | Each Plan node → one node function in StateGraph |
| Conditional branching (audit verdict → pass/revise) | `.add_conditional_edges(source, condition_fn, {True: target1, False: target2})` | Direct 1:1 | Plan's conditional edges map directly to StateGraph conditional edges |
| State threading (inputData passed between steps) | ExecutionState passed in node context | Direct 1:1 | Plan's ExecutionState is the context object |
| Run creation and start | `.compile()` and manual node invocation | Modified | Engine produces Plan; adapter iterates nodes. No separate "run" object needed. |
| SSE event streaming | StateGraph `stream()` or polling loop | Similar | Adapter polls ExecutionState and emits SSE events for each node completion |

**Features NOT used by Vāda (skip for adapter):**
- Memory / session storage (Vitakka concern, not Vāda)
- Tool execution / function calling
- Multi-agent tool coordination
- Structured streaming output types
- Agent autonomous looping (Vāda's loops are explicit in the workflow)

---

## 7. Recommendation

**Adapter scope is well-defined:**

The LangGraph adapter needs to support:
1. **Sequential node execution** — iterate Plan.graph.nodes in execution order, calling deriveTemplateState() and LLM for each
2. **Conditional edge branching** — evaluate Plan.conditionalEdges and follow the matching branch
3. **Revision cycles** — re-execute terminal-audit pairs based on audit verdict (no new logic; conditional edges handle it)
4. **State threading** — maintain ExecutionState across node executions; templates access it via deriveTemplateState()
5. **SSE streaming** — emit events as nodes complete (state_changed, agent_completed, terminal)
6. **Token tracking** — sum LLM usage across all nodes and report totals in Conclusion
7. **Structured output** — parse JSON conclusions and optional structured fields from agent outputs

**All features Vāda uses have direct LangGraph equivalents.** No custom implementations needed. The only "extra" work is mapping Plan → StateGraph on the fly (not a major undertaking).

**LangGraph + LangChain are the right choice.** They provide:
- StateGraph for the DAG structure
- `@langchain/anthropic` for Claude API calls with streaming
- Built-in token counting via ChatAnthropic's `usage_metadata`
- Conditional edge branching
- Async execution model matching Mastra's step pattern

**Next task (Phase 2.2):** Implement `LangGraphAdapter` class with `execute()` method that builds a StateGraph from the Plan and runs it, polling ExecutionState and emitting SSE events.
