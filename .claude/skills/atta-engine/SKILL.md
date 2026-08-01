---
name: atta-engine
description: Atta engine internals — Flow → Plan compilation via compileFlow, the v2 universal round-based schema, validation rules, terminal states, and immutability invariants. Load when working inside packages/engine or debugging unexpected Plan graph structure. Do NOT load for adapter/router/provider runtime work.
---

# `@atta/engine` — Flow Compiler

## Context

`@atta/engine` is a **pure library**. It takes a `Flow` (loaded from a v2 YAML file) and compiles it into a Plan: a declarative JSON-serializable execution DAG. Zero runtime dependencies. The engine compiles; the adapter executes. These responsibilities never cross.

The engine has no LangGraph, no Anthropic SDK, no fetch, no LangChain. If you're importing a runtime dependency here, you're in the wrong package.

The authoring interface is: YAML file → `loadFlow()` → `Flow` → `compileFlow()` → `Plan`. Direct TypeScript Team / Workflow construction is gone; the `Team` type and `Workflow` union were deleted in PR #47 (D-033 PR 2, May 12-13, 2026, apps/vada-ai/docs/vada-decisions-legacy.md D-033).

The engine powers Vāda today and will power Vitakka and Atta-the-product when those are built. It is part of AttaLabs infrastructure, sitting under `packages/engine`. See root `CLAUDE.md`'s naming bullets for the v2 brand framing (AttaLabs as the dev/lab ecosystem; Atta as one product within it; global D-025).

---

## Architecture (v2)

```
YAML file
    ↓
loadFlow(yaml: string)        parse + Zod validation + validateFlow rules
    ↓
Flow                          in-memory typed flow (rounds + agents + defaults)
    ↓
compileFlow(flow, question, model?, customVars?)
    ↓                         (shape detection: solo / brokered-no-synth /
                               brokered-synth / rounds-audit → matching Plan ids)
Plan (JSON DAG)
    ↓
[handed to adapter]
```

File tree (post-PR #47, May 13, 2026):

```
packages/engine/src/
├── types.ts                  # Plan, PlanNode, PlanEdge, PlanGraph, PlanNodeRole,
│                              # PlanNodeKind, PlanEdgeKind, RevisionCondition, Conclusion,
│                              # AgentOutput; re-exports Agent from @atta/agents
├── flow-types.ts             # Flow, Round, AgentInRound, OnFailureSpec, SignalType (public)
├── flow-schema.ts            # Zod schema for schema_version "2.0" YAMLs
├── flow-loader.ts            # loadFlow(yaml: string) → Flow (snake_case → camelCase)
├── validate-flow.ts          # validateFlow enforcing the 10 D-033 rules
├── compile-flow.ts           # compileFlow(flow, question, model?, customVars?) → Plan
│                              # — shape detection, node-id emission, conditional edges,
│                              # buildRevisionCondition (D-034 throws on equals/matches)
├── catalog-loader.ts         # loadFromCatalog(id) + listPublicSpecs(); anchors on import.meta.url
├── derive.ts                 # deriveTemplateState — TemplateState construction for the adapter
├── errors.ts                 # InvalidFlowConfigError, others
└── index.ts                  # Public exports
```

Deleted in PR #47 (do not reintroduce): `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `validate.ts`, `compile.ts`, the entire `compilers/` directory (`spec.ts`, `solo.ts`, `rounds.ts`, `custom.ts`, `brokered.ts`).

---

## Public API (v2)

```ts
import {
  loadFlow,
  compileFlow,
  validateFlow,
  resolveAgentFailure,
  InvalidFlowConfigError,
  loadFromCatalog,
  listPublicSpecs,
} from '@atta/engine'

import type {
  Flow,
  FlowSchema,
  Round,
  AgentInRound,
  OnFailureSpec,
  SignalType,
  Plan,
  PlanNode,
  PlanEdge,
  PlanGraph,
  PlanNodeRole,
  PlanNodeKind,
  PlanEdgeKind,
  RevisionCondition,
  Conclusion,
  AgentOutput,
  Agent,
} from '@atta/engine'
```

| Export | Purpose |
|--------|---------|
| `loadFlow(yaml: string)` | Parse + validate YAML string → `Flow`. Throws `InvalidFlowConfigError` on schema violations. Performs snake_case→camelCase conversion at the boundary. |
| `compileFlow(flow, question, model?, customVars?)` | `Flow` → `Plan`. Detects shape from topology and emits matching node ids. `model` overrides `flow.defaults.model`. |
| `validateFlow(flow)` | Run the 10 structural/semantic rules. Called internally by `loadFlow`. Exposed for callers that already have a `Flow` object. |
| `resolveAgentFailure(round)` | Compute the round's effective `agent_failure` policy applying Rule 10 defaults (parallel→continue, serial→abort) when not explicitly declared. |
| `InvalidFlowConfigError` | Thrown by `validateFlow` and `loadFlow` on rule violations. Includes the rule number and a human-readable message. |
| `loadFromCatalog(id: string)` | Load a flow by ID from the catalog directory (`packages/agents/vada-deliberation/yamls/`). Anchors on `import.meta.url`; env var `VADA_YAMLS_DIR` overrides path. |
| `listPublicSpecs()` | Return all non-experimental flows from the catalog, sorted alphabetically. Uses `readdirSync`. |
| `Flow` | Top-level v2 spec type (rounds + agents + defaults + metadata) |
| `Round` | Single round (agents, layout, repeats, message_template, agent_failure, on_failure) |
| `AgentInRound` | Reference to a top-level agent within a round; may carry per-agent message_template override |
| `OnFailureSpec` | `{ action: 'abort' | 'continue' | 'revise', target?, max_revisions?, signal }` |
| `Plan` family | Compiled output types (consumed by adapter) |
| `Agent` | Re-exported from `@atta/agents`; the engine never owns Agent types |

The old `loadSpec`, `compileSpec`, `specToTeam`, `DeliberationSpec`, `SpecAgent`, `FlowSpec`, `ReviewerSpec`, `Team`, `Workflow`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow` exports are **gone**. No backwards-compat shim. PR #47 migrated all 29 consumer files to the new surface atomically.

---

## Core Types

**Flow** — the input. Produced by `loadFlow()`.
```ts
interface Flow {
  schemaVersion: '2.0'
  id: string
  displayName: string
  description: string
  experimental: boolean
  benchmarked: boolean
  defaults: { model: string; maxTokens?: number }
  agents: Agent[]                 // from @atta/agents
  rounds: Round[]
}
```

**Round**
```ts
interface Round {
  id: string                       // kebab-case, unique within flow
  name: string                     // human-readable display
  layout: 'parallel' | 'serial'
  repeats?: number                 // default 1; must be >= 1
  agents: AgentInRound[]           // non-empty
  messageTemplate?: string         // round-level default; either this or every agent has its own
  agentFailure?: 'abort' | 'continue'  // explicit override of Rule 10 default
  onFailure?: OnFailureSpec
}
```

**AgentInRound**
```ts
interface AgentInRound {
  name: string                     // must exist in flow.agents[].name (Rule 4)
  messageTemplate?: string         // overrides round.messageTemplate for this agent
}
```

**OnFailureSpec**
```ts
interface OnFailureSpec {
  action: 'abort' | 'continue' | 'revise'
  target?: string                  // required when action='revise'; must be a prior round id (Rule 3)
  maxRevisions?: number            // required when action='revise'; >= 1 (Rule 6)
  signal: {
    type: 'contains' | 'equals' | 'matches'
    value: string
    caseSensitive?: boolean
  }
}
```

The schema accepts all three `signal.type` values for forward extensibility. The engine emits Plans only for `contains` — `compileFlow.buildRevisionCondition` throws explicitly on `equals` and `matches` (D-034 cleanup, PR #48). Schema reserves the types; compiler refuses them.

**RevisionCondition** (post-D-034, single-variant interface)
```ts
interface RevisionCondition {
  type: 'contains'                 // discriminator preserved for forward extensibility
  value: string
  caseSensitive?: boolean
}
```

The v1 union variants (`json-field-equals`, `json-field-truthy`) and their `getJsonField` adapter helpers were deleted in PR #48 — they were unreachable from any catalog YAML.

**Plan** — compiled output. Pure JSON, JSON-serializable. Consumed by adapter.
```ts
type Plan = {
  graph: PlanGraph
  agents: Agent[]
  classifierModes?: Record<string, ClassifierMode>
  // … other adapter-relevant fields
}
type PlanGraph = { nodes: PlanNode[]; edges: PlanEdge[]; entry: string; exit: string }
```

**PlanNodeKind** + **PlanEdgeKind** (vocabulary refactor, May 3, 2026, OQ-cross-9 Choice A — preserved through D-033)

PlanNodeKind values (7): `agent`, `synthesizer`, `audit`, `terminal`, `start`, `end`, `meta`.
PlanEdgeKind values (3): `flow`, `ordering`, `conditional`.

Every emitted node carries both `kind` (engine-vocab) and `role` (Plan vocabulary, used by the UI). `compileFlow` emits these consistently across all 4 shapes.

**Conclusion** — final output from adapter (engine defines the shape, adapter produces it). Carries an optional `estimatedCostUsd?: number` — total estimated USD cost across all LLM calls in the session, when pricing is known for every model used (herald-hardening-v1 Task 11).

---

## Shape Detection (D-033 pragmatic compromise)

`compileFlow` detects the flow's shape from its topology and emits matching v1 Plan node ids. This is a deliberate pragmatic weakening of the D-033 architectural ideal ("engine has zero branches"): the adapter and route handler depend on the v1 node-id conventions, so the compiler preserves them.

| Shape | Detection rule | Node ids emitted |
|-------|---------------|------------------|
| `solo` | `rounds.length === 1 && rounds[0].agents.length === 1` | `solo` |
| `brokered-no-synth` | Last round has >1 agent AND no round has `onFailure.action === 'revise'` | `reviewer-{AgentName}` for each |
| `brokered-synth` | `rounds.length >= 2 && rounds[rounds.length-1].agents.length === 1` AND no `onFailure.action === 'revise'` | `reviewer-{AgentName}` for each reviewer + `brokered-synthesis` |
| `rounds-audit` | Any round has `onFailure.action === 'revise'` | `round-{r}-{AgentName}`, `terminal-{k}`, `audit-{Name}-{k}`, `__END__` |

A future refactor (OQ-I in `vada-state.md`) could rewrite `compileFlow` as a generic walker emitting round-id-namespaced ids, but the adapter and route handler would need updating in lockstep. Captured as a known compromise, not a regression.

---

## Terminal States

Set on `Conclusion.terminalState`. All are valid completion states — do not treat any as a failure except `FAILED`.

| State | Meaning |
|-------|---------|
| `CLEAN` | Audits passed on first conclusion (or no audit was declared) |
| `REVISED` | Audits flagged; revision accepted |
| `MAX_REVISIONS` | Audits kept flagging; revision slots exhausted. System working correctly. |
| `FAILED` | Runtime error (API failure, timeout, crash). The only one that indicates a bug. |

---

## Node ID Scheme

Downstream code (adapter, mcp-server, dashboard, UI's `flow-helpers.ts`) depends on these IDs. Grep before renaming.

| Node type | ID pattern | Example |
|-----------|-----------|---------|
| Solo agent | `solo` | `solo` |
| Brokered reviewer | `reviewer-{agentName}` | `reviewer-Strategist` |
| Brokered synthesizer | `brokered-synthesis` | `brokered-synthesis` |
| Round agent (rounds-audit shape) | `round-{repeatIndex}-{agentName}` | `round-0-Strategist` |
| Round synthesizer | `terminal-{slotIndex}` | `terminal-0` |
| Audit | `audit-{agentName}-{slotIndex}` | `audit-BlindCritic-0` |
| Terminal end | `__END__` | `__END__` |

`slotIndex` increments with each revision cycle. The conditional edge from the last auditor of a slot wires to either the next `terminal-{slotIndex+1}` (revise path) or `__END__` (accept path) based on `anyOf` evaluation of audit outputs against the `RevisionCondition`.

---

## Rules

### Engine is Pure — No Runtime Dependencies

No fetch, no LangGraph, no Anthropic SDK, no LangChain. If a feature requires runtime I/O, it belongs in the adapter.

```ts
// ✅ Pure compilation
export function compileFlow(flow: Flow, question: string, model?: string, customVars?: Record<string, unknown>): Plan {
  validateFlow(flow)
  const shape = detectShape(flow)
  return buildPlan(flow, question, model, customVars, shape)
}

// ❌ Engine should never do this
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic()
```

### Plans are Immutable After Compilation

Never modify a Plan after `compileFlow()` returns. No "enrichment passes." If the adapter needs extra data, it lives in LangGraph state, not in the Plan.

```ts
// ✅ Compute once, return
const plan = compileFlow(flow, question)
return plan

// ❌ Never mutate
const plan = compileFlow(flow, question)
plan.graph.nodes.push(extraNode)  // ← violates immutability
```

### Validate Before Compile

`validateFlow` runs as a preflight inside `loadFlow`. Compilers assume input is valid. Adding validation inside `compileFlow` hides errors behind stack traces.

```ts
// ✅
const flow = loadFlow(yaml)     // validates; throws on rule violation
return compileFlow(flow, question)

// ❌
const flow = flowSchema.parse(yamlObject)  // skips validateFlow's semantic rules
return compileFlow(flow, question)         // misbehaves on bad input
```

### Content-Agnostic

The engine never injects prompts, examples, or content into Plans. User-provided Agents go in, structural graph comes out. This is a BYOK principle.

```ts
// ✅ Agent's systemPrompt comes from the flow
const node = { id, kind: 'agent', agent: agent.name }

// ❌ Engine should never add content
const node = { id, kind: 'agent', agent: agent.name,
               systemPromptOverride: 'You must also...' }
```

### `tools: string[]` is the Contract

Never change `Agent.tools` to boolean. The adapter's tool registry maps logical names → Anthropic API types. Boolean erases that mapping.

```ts
// ✅
tools: ['web_search', 'web_fetch']
tools: []                    // explicit no-tools

// ❌
tools: true                  // breaks registry mapping
```

### Parallel Auditors via Round Agents

In the v2 schema, parallel auditors are simply a round with `layout: parallel` and multiple agents in `agents[]`. The `on_failure.signal` evaluation applies "any of" semantics across the round's agent outputs.

```yaml
- id: audit
  name: Audit
  layout: serial            # serial because there's only one audit logical step
  agents:
    - name: BlindCritic
    - name: FactChecker
  message_template: |
    Principal's question: {{question}}
    Conclusion: {{conclusion}}
  on_failure:
    action: revise
    target: synthesis
    max_revisions: 1
    signal:
      type: contains
      value: FLAG
```

The runtime executes auditors in parallel by virtue of how `compileFlow` wires their edges; the v1 explicit `logic: any` field is gone (collapsed into "any of" being the only semantics in v2).

---

## Adding YAML specs is the workflow now

PR #47 (D-033 PR 2) removed the option of adding a new compiler. There is no `compilers/` directory anymore — `compileFlow` is the only entrypoint. New deliberation patterns are expressed as YAML.

For most additions:

1. Create `packages/agents/vada-deliberation/yamls/<new-spec>.yaml` following the v2 schema (see `yaml-schema-reference.md` + `vada-yaml-authoring` skill)
2. Auto-discovery: dropping the file in the directory is enough — `listPublicSpecs()` finds it, MCP `spec-registry.ts` delegates to it
3. Write a verify script in `apps/vada-ai/web/scripts/verify-<new-spec>.ts` using `loadFlow` + `compileFlow`
4. Run verify script; confirm transcript length matches expected count

If your shape genuinely cannot be expressed by composing rounds (a much higher bar than the v1 "add a Workflow type" question — most deliberation patterns are expressible as rounds), the work splits into engine + adapter:

- New `PlanNodeKind` or `PlanEdgeKind` if the new shape needs a structurally novel node or edge type — discuss with Principal before adding to the union
- New shape branch in `compileFlow.detectShape` (or an explicit `flow.shape` discriminator — currently rejected as a design direction)
- New behaviour in the adapter to execute the new shape

This is engine internals — the YAML author never touches it.

---

## Anti-patterns

- ❌ Runtime dependencies in engine (fetch, SDKs, state machines)
- ❌ Mutating `Plan` objects after compilation
- ❌ Validation inside `compileFlow` (belongs in `validateFlow`, called by `loadFlow`)
- ❌ Content injection (prompts, examples) into compiled Plans
- ❌ `Agent.tools` as boolean — use `string[]` always, `[]` for explicit none
- ❌ Renaming node IDs without grepping adapter + mcp-server + `flow-helpers.ts` for dependencies
- ❌ Importing `loadSpec` / `compileSpec` / `specToTeam` / `Team` / `Workflow` from `@atta/engine` — those exports were deleted in PR #47
- ❌ Reintroducing per-shape compilers (`compilers/solo.ts`, etc.) — D-033 collapsed them deliberately
- ❌ Treating `MAX_REVISIONS` as a failure — it's a valid terminal state
- ❌ Adding new terminal states without Principal approval (contract with adapter + mcp-server)
- ❌ Calling internal helpers (`buildRevisionCondition`, `detectShape`, `buildPlan`) from outside the engine — use `compileFlow`
- ❌ Importing from `@vada/teams` — that package was deleted long before D-033
- ❌ Setting `signal.type` to `'equals'` or `'matches'` in a YAML — engine throws explicitly (D-034). The schema reserves them; the compiler doesn't ship them yet.

---

## When you need more context

- v2 schema reference (top-level fields, round fields, on_failure, all 10 validation rules, template variables, worked examples for all 4 shapes): `apps/vada-ai/specs/yaml-schema-reference.md`
- Design rationale for the universal round-based schema, pragmatic weakenings, deferred PR 3 / PR 4: `apps/vada-ai/specs/generic-flow-refactor.md`
- Adapter-side execution + SDK-shape dispatch: **atta-adapter-langgraph** skill
- YAML authoring recipes by shape: **vada-yaml-authoring** skill
- Spec registry + MCP exposure: **vada-mcp-server** skill
- Architecture overview + locked decisions table: **vada-architecture** skill
- apps/vada-ai/docs/vada-decisions-legacy.md D-033 (universal flow schema) and D-034 (signal type rejection + RevisionCondition tighten)
- Ecosystem framing (AttaLabs / Atta / @atta packages — the engine lives under AttaLabs): root `CLAUDE.md`'s naming bullets, global D-025
