---
name: engine-layer
description: Vāda engine internals — Plan compilation, Agent/Workflow/Team types, validation rules, terminal states, and immutability invariants. Load when working inside packages/engine or debugging unexpected Plan graph structure. Do NOT load for adapter/router/provider runtime work.
---

# `@atta/engine` — Plan Compiler

## Context

`@atta/engine` is a **pure library**. It takes a Team + Workflow + question and compiles them into a Plan: a declarative JSON-serializable execution DAG. Zero runtime dependencies. The engine compiles; the adapter executes. These responsibilities never cross.

The engine has no LangGraph, no Anthropic SDK, no fetch, no LangChain. If you're importing a runtime dependency here, you're in the wrong package.

---

## Architecture

```
Team + Workflow + Question
        ↓
   validate.ts (preflight checks)
        ↓
   compilers/<kind>.ts
        ↓
       Plan (JSON)
        ↓
   [handed to adapter]
```

File tree:

```
packages/engine/src/
├── types.ts                  # Agent, Workflow, Team, Plan, Conclusion, ToolDecision
├── validate.ts               # Preflight validation before compilation
├── compilers/
│   ├── solo.ts               # SoloWorkflow → Plan
│   ├── rounds.ts             # RoundsWorkflow → Plan (most complex)
│   └── custom.ts             # CustomWorkflow → Plan
└── index.ts                  # Public exports
```

---

## Core Types

**Agent**
```ts
type Agent = {
  name: string;            // PascalCase, unique within Team
  model: string;           // e.g. 'claude-sonnet-4-5'
  systemPrompt: string;    // role-focused, not task-focused
  tools?: string[];        // logical names; [] for tool-off, never undefined for tool-using
  outputSchema?: ZodSchema;
};
```

**Workflow (tagged union)**
```ts
type Workflow =
  | { kind: 'solo'; agent: string }
  | { kind: 'rounds'; agents: string[]; rounds: number; roundSynthesizer?: string;
      conclusionAgent?: string; auditAgent?: string | string[]; maxRevisions?: number }
  | { kind: 'custom'; nodes: PlanNode[]; edges: PlanEdge[] };
```

**Team**
```ts
type Team = { name: string; agents: Agent[]; workflow: Workflow };
```

**Plan** — compiled output. Pure JSON. Consumed by adapter.
```ts
type Plan = { nodes: PlanNode[]; edges: PlanEdge[]; entry: string; exit: string };
```

**Conclusion** — final output from adapter (engine defines the shape, adapter produces it).

---

## Terminal States

Set on `Conclusion.terminalState`. All are valid completion states — do not treat any as a failure except `FAILED`.

| State | Meaning |
|-------|---------|
| `CLEAN` | Audits passed on first conclusion |
| `REVISED` | Audits flagged; revision accepted |
| `MAX_REVISIONS` | Audits kept flagging; revision slots exhausted. System working correctly. |
| `FAILED` | Runtime error (API failure, timeout, crash). The only one that indicates a bug. |

---

## Node ID Scheme

Downstream code (adapter, mcp-server, dashboard) depends on these IDs. Grep before renaming.

| Node type | ID pattern | Example |
|-----------|-----------|---------|
| Round agent | `round-{roundIndex}-{agentName}` | `round-0-Strategist` |
| Round synthesizer | `round-{roundIndex}-{synthesizerName}` | `round-0-Synthesizer` |
| Conclusion | `conclusion-{agentName}` | `conclusion-ConclusionSynthesizer` |
| Audit | `audit-{agentName}-{slotIndex}` | `audit-BlindCritic-0` |

`slotIndex` increments with each revision cycle.

---

## Rules

### Engine is Pure — No Runtime Dependencies

No fetch, no LangGraph, no Anthropic SDK, no LangChain. If a feature requires runtime I/O, it belongs in the adapter.

```ts
// ✅ Pure compilation
export function compile(workflow: RoundsWorkflow, team: Team): Plan {
  validate(workflow, team);
  return { nodes: buildNodes(workflow, team), edges: buildEdges(workflow), entry: '...', exit: '...' };
}

// ❌ Engine should never do this
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
```

### Plans are Immutable After Compilation

Never modify a Plan after `compile()` returns. No "enrichment passes." If the adapter needs extra data, it lives in LangGraph state, not in the Plan.

```ts
// ✅ Compute once, return
const plan = compile(workflow, team);
return plan;

// ❌ Never mutate
const plan = compile(workflow, team);
plan.nodes.push(extraNode);  // ← violates immutability
```

### Validate Before Compile

`validate.ts` runs as a preflight. Compilers assume input is valid. Adding validation inside a compiler hides errors behind stack traces.

```ts
// ✅
validate(workflow, team);   // throws if invalid
return compileRounds(workflow, team);

// ❌
return compileRounds(workflow, team);  // silently misbehaves on bad input
```

### Content-Agnostic

The engine never injects prompts, examples, or content into Plans. User-provided Agents go in, structural graph comes out. This is a BYOK principle.

```ts
// ✅ Agent's systemPrompt comes from the user
const node = { id, kind: 'agent', agent: agent.name };

// ❌ Engine should never add content
const node = { id, kind: 'agent', agent: agent.name,
               systemPromptOverride: 'You must also...' };
```

### `tools: string[]` is the Contract

Never change `Agent.tools` to boolean. The adapter's tool registry maps logical names → Anthropic API types. Boolean erases that mapping.

```ts
// ✅
tools: ['web_search', 'web_fetch']
tools: []                    // explicit no-tools

// ❌
tools: true                  // breaks registry mapping
tools: undefined             // ambiguous — use [] instead
```

### Parallel Auditors via `auditAgent: string[]`

`RoundsWorkflow.auditAgent` accepts single name or array. Array runs all auditors in parallel; ANY flag triggers revision. Conditional edge uses `anyOf` state condition.

```ts
// Single auditor
auditAgent: 'BlindCritic'

// Parallel auditors — logical + factual
auditAgent: ['BlindCritic', 'FactChecker']
```

---

## Adding a New Workflow Variant

1. Add `kind` to `Workflow` union in `types.ts`
2. Create `compilers/<kind>.ts` exporting `compile(workflow, team): Plan`
3. Update `validate.ts` to handle new kind
4. Export from `compilers/index.ts`
5. Add fixture test showing compiled Plan shape

---

## Anti-patterns

- ❌ Runtime dependencies in engine (fetch, SDKs, state machines)
- ❌ Mutating `Plan` objects after compilation
- ❌ Validation inside compilers (belongs in `validate.ts`, upstream)
- ❌ Content injection (prompts, examples) into compiled Plans
- ❌ `Agent.tools` as boolean or `undefined` for tool-using agents — use `string[]` always, `[]` for explicit none
- ❌ Renaming node IDs without grepping adapter + mcp-server + teams for dependencies
- ❌ Treating `MAX_REVISIONS` as a failure — it's a valid terminal state
- ❌ Adding new terminal states without Principal approval (contract with adapter + mcp-server)

---

## When you need more context

- Why `tools: string[]` and not boolean: `apps/vada-ai/specs/engine/design-decisions.md`
- Adapter-side execution: **adapter-layer** skill
- Agent/Team examples: `packages/teams/src/` and **teams-layer** skill
