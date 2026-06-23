---
name: atta-adapter-langgraph
description: LangGraph execution + cognitive router internals. Load when working in packages/adapter-langgraph — modifying graph execution, agent dispatch, tool filtering, classifier logic, cost tracking, state reducers, or debugging MAX_REVISIONS / latency issues. Do NOT load for pure Plan compilation (engine-layer) or team config (teams-layer).
---

# `@atta/adapter-langgraph` — Execution + Cognitive Router

## Context

The adapter takes compiled Plans from `@atta/engine` and executes them via LangGraph. LLM calls go directly through `@anthropic-ai/sdk` (no LangChain wrapper — it has a `top_p` bug we specifically avoid). The cognitive router lives here as internal nodes, NOT a separate package.

This is where Plans become real. Engine is pure; adapter is the runtime.

---

## Architecture

```
Plan (from @atta/engine)
        ↓
  graph-builder.ts           Plan → LangGraph StateGraph
        ↓
  [inject classifier nodes]  per Phase 3a.4
        ↓
  graph.invoke(recursionLimit: 150)
        ↓ per-turn:
    [Classifier node]  →  state.toolDecisions
        ↓
    [Agent node]       →  filters tools, calls LLM, writes transcript
        ↓
  adapter.ts                 accumulates into Conclusion
```

File tree:

```
packages/adapter-langgraph/src/
├── adapter.ts                # Main entry; compiles graph, invokes, builds Conclusion
├── graph-builder.ts          # Plan → StateGraph; injects classifier nodes before tool-enabled agents
├── graph-state.ts            # LangGraph state annotations + reducers
├── node-executor.ts          # Per-agent execution; tool filtering via state.toolDecisions
├── llm.ts                    # Direct Anthropic SDK wrapper
├── tools.ts                  # Tool registry (logical name → Anthropic API type)
└── cognitive-router/
    └── classifier.ts         # Haiku-based intent classifier node factory
```

---

## Cognitive Router — Four Capabilities

The router is four capabilities implemented as LangGraph nodes + state mutations. All live inside this package.

| Capability | Location | Behavior |
|------------|----------|----------|
| Intent Classifier | `cognitive-router/classifier.ts` | Haiku call before each tool-enabled agent. Returns `{ needs, budget, reason }` |
| Tool Filter | `node-executor.ts` | Reads `state.toolDecisions[nodeId]`; filters agent's declared tools to classifier subset |
| Budget Enforcer | `node-executor.ts` + state | Per-turn tool call counter; hard cap (default 5) |
| Cost & Latency Tracker | `llm.ts` → `state.toolUseHistory` | Per-turn metadata (tokens, duration, cost estimate) |

Deferred to V2: pre-fetched grounding, post-call reflection.

---

## LangGraph State Shape

```ts
type GraphState = {
  transcript: TranscriptEntry[];          // reducer: concat
  toolDecisions: Record<string, ToolDecision>;  // reducer: merge
  toolUseHistory: ToolUseRecord[];        // reducer: concat
  revisionCount: number;                  // reducer: last-write-wins
  // plus Plan-specific round state
};
```

Reducers matter. Wrong reducer causes data loss across parallel nodes (especially when `auditAgent` is array).

| Field | Reducer | Why |
|-------|---------|-----|
| `transcript` | `concat` | Appended by each node in order |
| `toolDecisions` | `merge` | Keyed by node ID; each node writes its own key |
| `toolUseHistory` | `concat` | Each turn appends its tool-use records |
| `revisionCount` | last-write-wins | Monotonic counter |

---

## Tool Registry

In `tools.ts`. Maps logical names → Anthropic API specifications.

```ts
{
  logicalName: 'web_search',
  anthropicType: 'web_search_20260209',   // KEEP CURRENT — old tags get API-rejected
  allowed_callers: ['direct'],            // REQUIRED for Haiku tool use
}
```

**Watch out:** Anthropic tool type tags have dates. `web_fetch_20251203` was stale and rejected mid-session; `web_fetch_20260209` is current as of 2026-04. Verify against Anthropic docs when adding tools.

---

## Classifier Behavior

Injected BEFORE each tool-enabled agent node. Graph-builder rewires incoming edges through it.

**Bias (tuned in Task 4.5):** err toward INCLUDING tools for reasoning roles. Only strip tools for audit roles.

**Classifier mode is driven entirely by the YAML `classifier.mode` field per agent.** The legacy name-substring hard rule (`agent.name.includes('Synthesizer') && !agent.name.includes('Conclusion')`) has been removed. The `always_tools` mode replaces it: when a YAML agent sets `classifier: { mode: always_tools }`, the classifier node is skipped and the agent's full tool list is always on.

**Role-based defaults in YAML:**

| Agent role | `classifier.mode` | Tools | Why |
|------------|-------------------|-------|-----|
| Strategist, Critic, Devil's Advocate | `auto` | Classifier decides | Needs tools; classifier can trim if question doesn't require search |
| round-Synthesizer | `always_tools` | Always on, no classifier call | Integrates round claims; must be able to verify. Replaces old name-substring hard rule. |
| FactChecker | `auto` | Classifier decides | Verification is the role |
| BlindCritic | `skip` | None | Blindness is the audit mechanism |
| ConclusionSynthesizer | `skip` | None | Commits answer; tools invite re-litigating |
| A0/A1 baselines | `skip` | None | Single-shot by definition |
| Brokered reviewers | `skip` | None | Single-shot advisory, no rounds |

---

## Rules

### Direct Anthropic SDK Only

LangChain wrapper has a `top_p` bug. Never use it for LLM calls.

```ts
// ✅ Direct SDK
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
const response = await client.messages.create({ ... });

// ❌ Never import LangChain wrappers for LLM calls
import { ChatAnthropic } from '@langchain/anthropic';  // has top_p bug
```

### Recursion Limit 150

Classifier nodes double graph step count. Default 25 fails on rounds with revision.

```ts
// ✅
await graph.invoke(initialState, { recursionLimit: 150 });

// ❌
await graph.invoke(initialState);  // uses default 25, will fail
```

### Tool Registry Requires `allowed_callers: ['direct']`

Without this, Haiku rejects tool use. Sonnet tolerates its absence; Haiku does not.

```ts
// ✅
{ logicalName: 'web_search', anthropicType: 'web_search_20260209',
  allowed_callers: ['direct'] }

// ❌ Haiku rejects with "does not support programmatic tool calling"
{ logicalName: 'web_search', anthropicType: 'web_search_20260209' }
```

### State Mutations Go Through Annotations

Never mutate state outside LangGraph annotations. Reducers handle concurrent node writes; bypassing them causes races.

```ts
// ✅ LangGraph handles via reducer
return { transcript: [newEntry] };  // concat reducer appends

// ❌ Race condition with parallel nodes
state.transcript.push(newEntry);
```

### MAX_REVISIONS is Valid

Both `CLEAN` and `MAX_REVISIONS` are valid terminal states. Do NOT loosen audit thresholds to chase CLEAN. Audits flagging is the product working as designed.

```ts
// ✅ Both acceptable
if (terminalState === 'CLEAN' || terminalState === 'MAX_REVISIONS' || terminalState === 'REVISED') {
  return buildSuccessfulConclusion(state);
}

// ❌ Don't treat MAX_REVISIONS as failure
if (terminalState !== 'CLEAN') throw new Error('deliberation failed');
```

### Cognitive Router Stays Internal

Do NOT extract `cognitive-router/` as a separate package in V1. Reviewer convergence (Round 23): over-modular. Future extraction only if external demand emerges (2027+).

---

## Debugging MAX_REVISIONS

Not usually a bug. Check in order:

1. Re-read the transcript. Was the audit legitimately catching a real issue?
2. Check classifier logs. Did round-Synthesizer get tools? (hard-rule should guarantee)
3. Is FactChecker flagging based on web search variance? Run 2-3 times — if intermittent, it's LLM variance, not a code bug
4. Is there a runtime error swallowed somewhere? Check stderr

Do NOT chase CLEAN by loosening audits.

---

## Debugging High Latency

Usual culprit: `web_search` returning 30k+ tokens of results. Synthesizer r0 taking 10+ minutes is a known failure mode.

Mitigations:
- Tighten classifier's budget for that role
- Pre-fetched grounding (V2 feature — runs search before agent, injects summary)

---

## Anti-patterns

- ❌ LangChain wrappers for LLM calls (use `@anthropic-ai/sdk` directly)
- ❌ Forgetting `allowed_callers: ['direct']` in tool registry (Haiku rejection)
- ❌ `recursionLimit: 25` (default; insufficient for classifier-augmented graphs)
- ❌ Mutating state outside LangGraph annotations (causes races with parallel nodes)
- ❌ Treating `MAX_REVISIONS` as failure (it's a valid terminal state)
- ❌ Stripping tools from round-Synthesizer (empirical degradation, Task 4.5 — use `always_tools` in YAML)
- ❌ Writing transcript entries outside `node-executor.ts` (breaks trace ordering)
- ❌ Extracting `cognitive-router/` to separate package (Round 23 rejected)

---

## When you need more context

- Classifier tuning history: commits `2e6dcb2` (Task 3), Task 4.5 (classifier tuning)
- Why router is inside adapter: `apps/vada-ai/specs/engine/v2-results/round-23-*.md`
- Plan structure: **engine-layer** skill
- Agent configs and tool assignments: **atta-teams** skill (`packages/agents/vada-deliberation/src/` + `packages/agents/vada-deliberation/yamls/`)
