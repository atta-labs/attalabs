---
name: atta-engine
description: Vāda engine internals — Flow compilation, Plan graph types, validation rules, terminal states, and immutability invariants. Load when working inside packages/engine or debugging unexpected Plan graph structure. Do NOT load for adapter/router/provider runtime work.
---

# `@atta/engine` — Plan Compiler (v2)

## Context

`@atta/engine` is a **pure library**. It takes a `Flow` (parsed from a v2 YAML file) and compiles it into a Plan: a declarative JSON-serializable execution DAG. Zero runtime dependencies. The engine compiles; the adapter executes. These responsibilities never cross.

The engine has no LangGraph, no Anthropic SDK, no fetch, no LangChain. If you're importing a runtime dependency here, you're in the wrong package.

As of D-033 (May 12-13, 2026, PRs #41 + #47), the engine operates on a single universal round-based schema. The authoring interface is: YAML file → `loadFlow()` → `Flow` → `compileFlow()` → `Plan`. The prior `DeliberationSpec` / `compileSpec` / `Team` / `Workflow` union types are deleted.

---

## Architecture

```
YAML file (schema_version: "2.0")
    ↓
loadFlow(yaml: string)        parse + Zod validation + validateFlow()
    ↓
Flow                          in-memory typed flow (rounds-based)
    ↓
compileFlow(flow, question, model?, customVars?)
    ↓ (shape detection: solo | brokered-no-synth | brokered-synth | rounds-audit)
Plan (JSON DAG)
    ↓
[handed to adapter]
```

File tree:

```
packages/engine/src/
├── types.ts                  # Plan, PlanNode, PlanEdge, PlanGraph, PlanNodeRole, PlanNodeKind,
│                             # PlanEdgeKind, RevisionCondition, ExecutionState, TemplateState,
│                             # Adapter, ExecuteParams, ExecutionHooks, AgentOutput, Conclusion,
│                             # Corpus, Experiment, ExperimentResult (re-exports Agent from @atta/agents)
├── flow-types.ts             # Flow, Round, FlowAgent, AgentInRound, OnFailureSpec, FailureSignal
├── flow-schema.ts            # Zod schema (FlowSchema); schema_version '2.0'
├── flow-loader.ts            # loadFlow(yaml: string) → Flow
├── validate-flow.ts          # validateFlow(flow) — 10 structural + semantic rules
├── compile-flow.ts           # compileFlow(flow, question, model?, customVars?) → Plan
│                             # Shape detection + per-shape compilation logic in one file
├── catalog-loader.ts         # loadYamlFromCatalog(id) + listPublicSpecs() + validateAllSpecs()
├── errors.ts                 # InvalidFlowConfigError + supporting error types
├── derive.ts                 # deriveTemplateState(state, node) — projection from ExecutionState
├── validate-template.ts      # Handlebars template syntax validation
└── index.ts                  # Public exports
```

The `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `compile.ts`, and `compilers/*.ts` files were all deleted in PR #47. There is no per-shape compiler module anymore — `compile-flow.ts` is the single entrypoint.

---

## Public API

```ts
import {
  loadFlow,
  compileFlow,
  validateFlow,
  resolveAgentFailure,
  loadYamlFromCatalog,
  listPublicSpecs,
  validateAllSpecs,
  deriveTemplateState,
  InvalidFlowConfigError,
  FlowSchema,
} from '@atta/engine'

import type {
  Flow,
  Round,
  FlowAgent,
  AgentInRound,
  OnFailureSpec,
  FailureSignal,
  Plan,
  PlanNode,
  PlanEdge,
  PlanGraph,
  PlanNodeRole,
  PlanNodeKind,
  PlanEdgeKind,
  RevisionCondition,
  AgentOutput,
  Conclusion,
  ExecutionState,
  TemplateState,
  Adapter,
  ExecuteParams,
  ExecutionHooks,
  Agent,
} from '@atta/engine'
```

| Export | Purpose |
|--------|---------|
| `loadFlow(yaml: string)` | Parse + validate YAML string → `Flow`. Throws on Zod or `validateFlow` violations. |
| `compileFlow(flow, question, model?, customVars?)` | `Flow` → `Plan`. Shape detected from rounds topology. `model` overrides `flow.defaults.model`. `customVars` is interpolated into agent system prompts via Handlebars. |
| `validateFlow(flow)` | Throws `InvalidFlowConfigError` on any of 10 rule violations. Called by `loadFlow` and by `compileFlow` defensively. |
| `resolveAgentFailure(round)` | Returns the effective `agent_failure` policy for a round: explicit declaration wins; default is `continue` for `parallel`, `abort` for `serial` (Rule 10). |
| `loadYamlFromCatalog(id)` | Load a spec by ID from `apps/vada-ai/yamls/`. Path anchored to `import.meta.url`; `VADA_YAMLS_DIR` env var overrides. |
| `listPublicSpecs()` | All non-experimental specs in the catalog, sorted alphabetically. `readdirSync`-based — auto-discovers new YAMLs. |
| `validateAllSpecs()` | Boot-time validation across the catalog. Throws on any malformed YAML; called from MCP server and web route handler at startup. |
| `deriveTemplateState(state, node)` | Adapter contract: produces the Handlebars context for a node from `ExecutionState`. Adapters MUST use this rather than constructing template state manually. |
| `InvalidFlowConfigError` | Thrown by `validateFlow` for any rule violation. Includes path + violated rule. |
| `FlowSchema` | Zod schema; consumers can call `FlowSchema.parse()` directly for partial validation. |

There is no longer a `compile()` or `compileSpec()` export. `specToTeam` is gone. Direct construction of internal "Team" or "Workflow" objects is not supported — author YAMLs and load through `loadFlow`.

---

## Core Types

### Flow — the input

```ts
interface Flow {
  schemaVersion: '2.0'
  id: string                  // kebab-case, matches filename
  displayName: string
  description: string
  experimental: boolean
  benchmarked: boolean
  defaults: { model: string; maxTokens?: number }
  agents: FlowAgent[]
  rounds: Round[]             // non-empty
}
```

### Round

```ts
interface Round {
  id: string                  // kebab-case, unique within flow
  name: string                // human-readable display name
  layout: 'serial' | 'parallel'
  repeats?: number            // default 1, must be >= 1
  agents: AgentInRound[]      // non-empty
  messageTemplate?: string    // round-level default
  agentFailure?: 'abort' | 'continue'
  onFailure?: OnFailureSpec
}

interface AgentInRound {
  name: string                // must exist in top-level Flow.agents
  messageTemplate?: string    // per-agent override; if absent, falls back to round.messageTemplate
}
```

### OnFailureSpec

```ts
interface OnFailureSpec {
  action: 'abort' | 'continue' | 'revise'
  target?: string             // round id; required when action='revise'; must be a PRIOR round
  maxRevisions?: number       // required when action='revise'; >= 1
  signal: FailureSignal       // how failure is detected
}

interface FailureSignal {
  type: 'contains' | 'equals' | 'matches'  // schema accepts all three; engine implements 'contains' only
  value: string
  caseSensitive?: boolean
}
```

The schema accepts `equals` and `matches` for forward extensibility. `compileFlow` throws explicitly via `buildRevisionCondition` if it encounters either — see D-034. v2 ships with substring matching only.

### FlowAgent

```ts
interface FlowAgent {
  name: string                // free-form (often PascalCase), unique within flow
  description?: string
  systemPrompt: string        // Handlebars-rendered against customVars at compile time
  model?: string
  maxTokens?: number
  tools?: string[]
  classifier?: { mode: 'auto' | 'skip' | 'always_tools'; budget?: number }
  outputFormat?: 'text' | 'structured'
  outputSchema?: Record<string, unknown>
  role?: string               // presentation hint for UI rendering — engine does not consume
  editable?: boolean          // UI hint: surface in reviewer config picker
}
```

The `role` field is the UI's concern — the engine treats it as opaque metadata. `AgentRole` as an engine concept was deleted in May (vendor identity replaces role for unroled agents like Vāda Reviewers' Gemini/GPT/Grok slots).

### Plan + graph types

```ts
interface Plan {
  schemaVersion: '1.0'        // Plan schema version, distinct from Flow schema version
  question: string
  model: string
  agents: Record<string, Agent>
  teamName: string            // historically the team name; now flow.id
  graph: PlanGraph
  specId?: string
  responseMode?: 'synthesize' | 'concatenate'
  responseNode?: string
  maxRevisions?: number
  classifierModes?: Record<string, 'auto' | 'skip' | 'always_tools'>
}

interface PlanGraph {
  nodes: Record<string, PlanNode>
  edges: PlanEdge[]
  conditionalEdges: PlanConditionalEdge[]
  entryNode: string
}

interface PlanNode {
  id: string                  // see "Node ID Scheme" below
  agentName: string
  inputTemplate: string       // Handlebars
  role: PlanNodeRole          // execution routing (adapter)
  kind: PlanNodeKind          // categorical classification (visualization)
  metadata: PlanNodeMetadata
}

type PlanNodeRole = 'solo' | 'round' | 'terminal' | 'audit' | 'custom-step'

type PlanNodeKind =
  | 'solo-agent'
  | 'parallel-peer'
  | 'synthesizer'
  | 'auditor'
  | 'custom-step'
  | 'revision-terminal'
  | 'system-sentinel'

type PlanEdgeKind = 'flow' | 'ordering'
```

The `Team`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, and `Workflow` discriminated union are **deleted**. Plan graph types are the engine's output surface.

---

## Compilation behaviour (shape detection)

`compileFlow` detects four shapes from the flow's topology and emits matching Plan node ids. The adapter and route handler depend on the v1 node-id conventions, so `compileFlow` preserves them. This is documented as a deliberate pragmatic weakening of the "engine has zero branches" ideal in D-033 — see OQ-I in `vada-state.md`.

| Detected shape | Trigger | Node ids emitted |
|----------------|---------|------------------|
| `solo` | 1 round, 1 agent | `solo` |
| `brokered-no-synth` | 1+ rounds, last round has >1 agent, no `on_failure: revise` | `reviewer-{AgentName}` |
| `brokered-synth` | 2+ rounds, last round has exactly 1 agent, no `on_failure: revise` | `reviewer-{AgentName}` + `brokered-synthesis` |
| `rounds-audit` | Any round has `on_failure.action: 'revise'` | `round-{r}-{AgentName}`, `terminal-{k}`, `audit-{Name}-{k}`, `__END__` |

`{r}` = repeat index within a round (0-based). `{k}` = revision slot index (0-based; 0 = first execution, k = kth revision). `__END__` is the LangGraph routing sentinel; filter it before rendering.

### Conditional edge wiring (rounds-audit)

For each revision slot `k` from 0 to `maxRevisions - 1`:

- Flow edge: `terminal-{k}` → `audit-{firstAuditor}-{k}`
- Ordering edges within audit slot: `audit-{name}-{k}` → `audit-{nextName}-{k}`
- Conditional edge from last auditor in slot: `audit-{lastAuditor}-{k}` → `terminal-{k+1}` (if any auditor signals) OR `__END__` (otherwise). Evaluation uses `anyOf` across all audit node outputs in the slot.

The terminal node at slot `k+1` is pre-allocated even if it never executes. The Plan is a DAG with no cycles — each revision path is a distinct pre-allocated node sequence.

---

## Terminal States

Set on `Conclusion.terminalState`. All but `FAILED` are valid completion states.

| State | Meaning |
|-------|---------|
| `CLEAN` | Audits passed on first conclusion (or no audit configured) |
| `REVISED` | Audits flagged; revision accepted |
| `MAX_REVISIONS` | Audits kept flagging; revision slots exhausted. System working correctly. |
| `FAILED` | Runtime error (API failure, timeout, crash). The only one that indicates a bug. |

---

## Node ID Scheme

Downstream code (adapter, mcp-server, dashboard, calculator, UI flow visualizer) depends on these IDs. Grep before renaming.

| Node type | ID pattern | Example |
|-----------|-----------|---------|
| Solo (single round, single agent) | `solo` | `solo` |
| Brokered reviewer | `reviewer-{agentName}` | `reviewer-Gemini` |
| Brokered synthesizer | `brokered-synthesis` | `brokered-synthesis` |
| Round agent (rounds-audit) | `round-{repeatIndex}-{agentName}` | `round-0-Strategist` |
| Terminal / revision slot | `terminal-{revisionIndex}` | `terminal-0`, `terminal-1` |
| Audit agent | `audit-{agentName}-{revisionIndex}` | `audit-BlindCritic-0` |
| LangGraph sentinel | `__END__` | (filter before render) |

The historical `round-{r}-{synthesizerName}` and `conclusion-{agentName}` ids no longer exist — terminal/synthesis nodes are now `terminal-{k}` or `brokered-synthesis` depending on shape.

---

## Validation Rules (D-033)

`validateFlow` enforces 10 rules. All raise `InvalidFlowConfigError`.

| Rule | Description |
|------|-------------|
| 1 | `rounds.length >= 1` |
| 2 | Round ids unique within a flow |
| 3 | `on_failure.target` references a **prior** round (no forward or self references) |
| 4 | Every `agents[].name` referenced in a round exists in the top-level `agents` array |
| 5 | `repeats >= 1` when present |
| 6 | `max_revisions >= 1` when `action='revise'` |
| 7 | `action='revise'` requires both `target` and `max_revisions` |
| 8 | Either the round has `message_template` OR every agent in the round has its own |
| 9 | Rounds with zero agents are rejected |
| 10 | `agent_failure` default derivation: `continue` for `parallel`, `abort` for `serial`. Explicit always wins. (Applied by `resolveAgentFailure()`, not `validateFlow` directly.) |

---

## Rules

### Engine is Pure — No Runtime Dependencies

No fetch, no LangGraph, no Anthropic SDK, no LangChain. If a feature requires runtime I/O, it belongs in the adapter.

```ts
// ✅ Pure compilation
export function compileFlow(flow: Flow, question: string, model?: string): Plan {
  validateFlow(flow)
  return /* shape detection + per-shape compilation */
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
plan.graph.nodes['extra'] = extraNode  // ← violates immutability
```

### Validate Before Compile

`validateFlow` runs as a preflight. Per-shape compilation logic assumes the input is valid. Adding validation inside the per-shape branches hides errors behind stack traces.

```ts
// ✅ The current entrypoint structure
export function compileFlow(flow: Flow, question: string, model?: string, customVars?: Record<string, string>): Plan {
  validateFlow(flow)
  const shape = detectShape(flow)
  switch (shape) {
    case 'solo': return compileSolo(flow, base)
    case 'brokered-no-synth': return compileBrokeredNoSynth(flow, base)
    case 'brokered-synth': return compileBrokeredSynth(flow, base)
    case 'rounds-audit': return compileRoundsAudit(flow, base)
  }
}
```

### Content-Agnostic

The engine never injects prompts, examples, or content into Plans. User-provided Agents go in, structural graph comes out. This is a BYOK principle and a D-033 ratification commitment.

```ts
// ✅ Agent's systemPrompt comes from the flow (Handlebars-rendered against customVars)
const node = { id, agentName, inputTemplate, role, kind, metadata }

// ❌ Engine should never add content
const node = { ..., systemPromptOverride: 'You must also...' }
```

### `tools: string[]` is the Contract

Never change `FlowAgent.tools` to boolean. The adapter's tool registry maps logical names → Anthropic API types. Boolean erases that mapping.

```ts
// ✅
tools: ['web_search', 'web_fetch']
tools: []                    // explicit no-tools

// ❌
tools: true                  // breaks registry mapping
```

### Parallel Auditors via Audit Round Agents Array

The audit round's `agents` array accepts multiple agent names. They run with `anyOf` semantics in the conditional edge — if ANY auditor's output triggers the signal, revision fires.

```yaml
# Single auditor
- id: audit
  name: Audit
  layout: serial
  agents:
    - name: BlindCritic
  on_failure: { action: revise, target: synthesis, max_revisions: 1, signal: { type: contains, value: FLAG } }

# Parallel auditors — logical + factual
- id: audit
  name: Audit
  layout: serial
  agents:
    - name: BlindCritic
    - name: FactChecker
  on_failure: { action: revise, target: synthesis, max_revisions: 1, signal: { type: contains, value: FLAG } }
```

---

## Adding YAML specs is the workflow

The "adding a new workflow variant" pattern from v1 is gone. The v2 schema accommodates every shape we've needed to date with no engine code changes. New specs are authored as YAMLs and dropped into `apps/vada-ai/yamls/`:

1. Write `<new-spec>.yaml` per `vada-yaml-authoring` SKILL (unversioned filename — D-013 + D-025)
2. Set `experimental: true` if it should be hidden from `listPublicSpecs()`
3. Write a verify script in `apps/vada-ai/web/scripts/verify-<spec>-port.ts` using `loadFlow` + `compileFlow`
4. Run verify script; confirm transcript length matches expected count

Genuine engine-level changes (new node kinds, new template variables, new conditional edge semantics) are now rare and require explicit decision-log entry.

---

## Anti-patterns

- ❌ Runtime dependencies in engine (fetch, SDKs, state machines)
- ❌ Mutating `Plan` objects after compilation
- ❌ Validation inside the per-shape compilation branches (belongs in `validateFlow`, upstream)
- ❌ Content injection (prompts, examples) into compiled Plans
- ❌ `FlowAgent.tools` as boolean — use `string[]` always, `[]` for explicit none
- ❌ Renaming node IDs without grepping adapter + mcp-server + UI + calculator for dependencies
- ❌ Adding a new shape branch in `compileFlow` when the YAML topology can be expressed under one of the four existing shapes — the bar for new shape branches is genuine structural difference (e.g., dynamic fan-out, code/tool nodes)
- ❌ Treating `MAX_REVISIONS` as a failure — it's a valid terminal state
- ❌ Adding new terminal states without Principal approval (contract with adapter + mcp-server)
- ❌ Calling internal shape compilation functions (`compileSolo`, `compileBrokeredNoSynth`, etc.) directly — they are not exported; use `compileFlow`
- ❌ Importing from `@vada/teams` or `@atta/engine`'s deleted modules (`spec-types`, `spec-schema`, `spec-loader`, `compile`, `compilers/*`) — these are all gone post-PR #47

---

## When you need more context

- Why `tools: string[]` and not boolean: `apps/vada-ai/specs/engine/design-decisions.md`
- Adapter-side execution: **atta-adapter-langgraph** skill
- YAML authoring: **vada-yaml-authoring** skill
- YAML schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`
- D-033 design rationale: `apps/vada-ai/specs/generic-flow-refactor.md`
- D-033 + D-034 entries: `apps/vada-ai/specs/vada-decisions.md`
- Vāda current state: `apps/vada-ai/specs/vada-state.md` (Phase 14 + OQ-H + OQ-I)
