---
name: atta-engine
description: Atta engine internals — Flow → Plan compilation via compileFlow, the v2 universal round-based schema, validation rules, terminal states, and immutability invariants. Load when working inside packages/engine or debugging unexpected Plan graph structure. Do NOT load for adapter/router/provider runtime work.
---

# `@atta/engine` — Flow Compiler

## Context

`@atta/engine` is a **pure library**. It takes a `Flow` (loaded from a v2 YAML file) and compiles it into a Plan: a declarative JSON-serializable execution DAG. Zero runtime dependencies (no LangGraph, no Anthropic SDK, no fetch, no LangChain — see "Rules" below). The engine compiles; the adapter executes. These responsibilities never cross.

The authoring interface is: YAML file → `loadFlow()` → `Flow` → `compileFlow()` → `Plan`. Direct TypeScript Team / Workflow construction is gone; the `Team` type and `Workflow` union were deleted in the generic flow refactor's second PR (May 12-13, 2026).

The engine powers Vāda today and will power Vitakka and Atta-the-product when those are built. It is part of AttaLabs infrastructure, sitting under `packages/engine`. See root `CLAUDE.md`'s naming bullets for the v2 brand framing (AttaLabs as the dev/lab ecosystem; Atta as one product within it).

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

File tree (post generic flow refactor, May 13, 2026):

```
packages/engine/src/
├── types.ts                  # Plan, PlanNode, PlanEdge, PlanGraph, PlanNodeRole,
│                              # PlanNodeKind, PlanEdgeKind, RevisionCondition, Conclusion,
│                              # AgentOutput; re-exports Agent from @atta/agents
├── flow-types.ts             # Flow, Round, AgentInRound, OnFailureSpec, SignalType (public);
│                              # StepsFlow, Step, AgentStep, MechanicalStep, AgentRole (steps[])
├── flow-schema.ts            # Zod schema for schema_version "2.0" YAMLs; rounds XOR steps
├── flow-loader.ts            # loadFlow(yaml) → Flow; loadStepsFlow(yaml) → StepsFlow (snake_case → camelCase)
├── validate-flow.ts          # validateFlow (10 v2 rules + steps-shape rejection);
│                              # validateStepsFlow (step ids, role refs, resume refs)
├── compile-flow.ts           # compileFlow(flow, question, model?, customVars?) → Plan
│                              # — shape detection, node-id emission, conditional edges,
│                              # buildRevisionCondition (throws on equals/matches)
├── catalog-loader.ts         # loadFromCatalog(id) + listPublicSpecs(); anchors on import.meta.url
├── derive.ts                 # deriveTemplateState — TemplateState construction for the adapter
├── errors.ts                 # InvalidFlowConfigError, others
└── index.ts                  # Public exports
```

Deleted in the generic flow refactor (do not reintroduce): `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `validate.ts`, `compile.ts`, the entire `compilers/` directory (`spec.ts`, `solo.ts`, `rounds.ts`, `custom.ts`, `brokered.ts`).

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
| `loadStepsFlow(yaml: string)` | Parse + validate YAML string → `StepsFlow`. Throws if the YAML declares `rounds` instead. |
| `validateStepsFlow(flow)` | The steps-shape rules (step ids, role refs, resume refs, `decision` targets, `dependsOn` cycles). Called internally by `loadStepsFlow`. |
| `resolveStepDependsOn(steps, index)` | A step's effective dependencies — an explicit `dependsOn` verbatim, otherwise the preceding step. The single source of truth the validator and compiler share. |
| `StepsFlow` / `AnyFlow` / `Step` family | The steps-shape types, so a caller can name what `compileFlow` already accepted |

The old `loadSpec`, `compileSpec`, `specToTeam`, `DeliberationSpec`, `SpecAgent`, `FlowSpec`, `ReviewerSpec`, `Team`, `Workflow`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow` exports are **gone**. No backwards-compat shim. The generic flow refactor migrated all 29 consumer files to the new surface atomically.

---

## Distribution — the artifact contract

Three packages ship as installable artifacts: `@atta/agents` (`packages/atta-agents`), `@atta/engine`, and `@atta/executor-agent-spawn`. They are one set, not three independent ones — `@atta/engine`'s public declarations re-export `Agent` from `@atta/agents`, so an artifact set missing the agents package has declarations naming a package its consumer cannot install. `@atta/adapter-langgraph` is deliberately not in the set: it runs the rounds shape and no external consumer of the agent-lifecycle runtime needs it.

**`dist/` is the contract; `src/` is not.** Each manifest's `main`, `types` and `exports` point at `./dist/…`, and `files` is `["dist"]`, so a packed tarball contains built output and nothing else. Pointing them at `./src/index.ts`, which is what they did before, made the distribution contract "have this repository's TypeScript and a transpiler that agrees with it" — true for a workspace sibling and for nobody else.

**Two emitters, one `dist/`, for two different reasons:**

| Script | Tool | Produces | Why that tool |
|--------|------|----------|---------------|
| `build:types` | `tsc -p tsconfig.build.json` | `dist/*.d.ts` (`emitDeclarationOnly`, no declaration maps) | Only the compiler can emit declarations. Maps are off so nothing in the artifact names a path on the machine that built it. |
| `build:js` | `bun build … --format esm --packages external` | `dist/index.js`, one bundled module | A multi-file `tsc` ESM emit keeps extensionless relative specifiers (`./types`), which Node's ESM resolver rejects. Bundling removes every relative specifier instead of rewriting them. `--packages external` leaves real dependencies (`zod`, `js-yaml`, `@langchain/langgraph`) to the consumer's own install. |

The emitted declarations are still multi-file and still carry extensionless relative specifiers, so a consumer resolves them with `bundler`- or `node10`-style module resolution — which is what every consumer in this repo already uses (`@atta/typescript-config/base.json` sets `"moduleResolution": "bundler"`). A consumer on `node16`/`nodenext` would need a declaration bundler; none ships today.

**`turbo`'s `typecheck` task depends on `^build`, and that dependency is load-bearing.** A source-free `exports` entry means a consumer resolves `@atta/engine` to files that only a build produces — `dist/index.d.ts` for its `tsc`, `dist/index.js` for its `vitest`, whose `vite` resolver reads the same `exports` map and fails outright when the entry is missing. Neither `^typecheck` nor the package's own scripts can supply that: `build` is the only task declaring `dist/**` as its `outputs`, so it is the only one `turbo` restores from cache on a hit.

That last clause is the whole reason the dependency lives in `turbo.json` rather than in a package script. An earlier revision had each `typecheck` script emit declarations itself (`build:types && tsc --noEmit`), which ordered correctly and passed on any machine that had already built once — and failed in CI, where `@atta/ui`'s `vitest` run found no `dist/index.js` to resolve. A task with no declared `outputs` replays its logs on a cache hit and restores no files, so an emit hidden inside one is a side effect the cache is entitled to skip. Put the build where the cache can see it.

**Packing resolves `workspace:*`, and that is the whole mechanism.** `bun pm pack` rewrites each `workspace:*` range in the packed manifest to the version the workspace member actually declares (`@atta/agents` → `0.1.0`). `npm pack` does not — it leaves `workspace:` in place, and `publishConfig` overrides with it — so `bun pm pack` is the packing tool, not an interchangeable choice. `prepack` runs `build` first, so a hand-run pack cannot ship a stale or missing `dist/`.

**Every package keeps `private: true`.** Nothing here is published to a registry; the contract is proven by packing and installing a tarball. The flag is what keeps an accidental `npm publish` from being the way anyone finds that out.

**`"sideEffects": false` is forbidden in all three manifests.** Under `bun 1.3.14`, `build:js`'s bundler treats that flag as license to tree-shake re-exports it judges unused from the bundle's own entry point — `listPublicSpecs` and other re-exported names vanish from `dist/index.js` even though the bundle is the package's only public surface and every export is reachable from outside the package. The flag is a lie for a package whose entire `src/` is the export list: there is no internal-only code for it to protect. `grep -rn sideEffects packages/atta-agents/package.json packages/engine/package.json packages/executor-agent-spawn/package.json` must return no output; `grep -c listPublicSpecs packages/engine/dist/index.js` after a build must be `2` (declaration + implementation), not `0`. The bug never shows locally: the repo pins `bun 1.4.2` in `packageManager`, but Vercel installs `1.3.14`, so only a Vercel build (or `npx bun@1.3.14 build` by hand) reproduces it.

**The proof is a run, not an assertion.** `packages/executor-agent-spawn/scripts/verify-external-consumer.ts` builds and packs all three, re-reads every packed manifest (refusing a workspace range, a source-pointing entry, an entry naming a file the tarball lacks, or any non-declaration `.ts` file), installs the tarballs into a fresh project in the OS temp directory — asserted to be outside this checkout — and there type-checks and runs a consumer that compiles a steps-shaped Flow and drives the full lifecycle. See `.claude/skills/atta-adapter-langgraph/SKILL.md`'s source-to-public-contract matrix for what that lifecycle proves and why each part of it is normative.

That consumer's `overrides` block pins the two transitive `@atta/*` ranges to the same tarballs. It stands in for the registry this task deliberately does not use: a package manager reading `"@atta/engine": "0.0.1"` out of a packed manifest looks it up publicly and gets a 404. Nothing else is pinned, so every other dependency resolves the way it would for any consumer.

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

The schema accepts all three `signal.type` values for forward extensibility. The engine emits Plans only for `contains` — `compileFlow.buildRevisionCondition` throws explicitly on `equals` and `matches` — a later cleanup restricting the schema's forward-extensibility placeholder. Schema reserves the types; compiler refuses them.

**RevisionCondition** (single-variant interface)
```ts
interface RevisionCondition {
  type: 'contains'                 // discriminator preserved for forward extensibility
  value: string
  caseSensitive?: boolean
}
```

The v1 union variants (`json-field-equals`, `json-field-truthy`) and their `getJsonField` adapter helpers were deleted — they were unreachable from any catalog YAML.

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

**PlanNodeKind** + **PlanEdgeKind** (vocabulary refactor, May 3, 2026, OQ-cross-9 Choice A — preserved through the generic flow refactor)

PlanNodeKind values (9): `solo-agent`, `parallel-peer`, `synthesizer`, `auditor`, `custom-step`, `revision-terminal`, `system-sentinel`, `agent-spawn`, `mechanical` — the last two belong to nodes compiled from a `steps`-shaped Flow (see the `agent-lifecycle` shape below), not the four rounds-shaped compilers.
PlanEdgeKind values (2): `flow`, `ordering`. A conditional edge is not a `PlanEdgeKind` value — it's a separate `PlanConditionalEdge` list on `PlanGraph.conditionalEdges`.

Every emitted node carries both `kind` (engine-vocab) and `role` (`PlanNodeRole` — `solo | round | terminal | audit | custom-step | agent-spawn | mechanical` — used by the adapter for execution routing and by the UI). `compileFlow` emits these consistently across the four rounds-shaped compilers.

**`PlanNode` is a discriminated union, not one flat interface**: `PlanAgentNode` (the four rounds-shaped compilers — `agentName`/`inputTemplate` mandatory, resolved against `Plan.agents`) | `PlanAgentSpawnNode` (`agent-spawn` nodes — `promptTemplate`/`agentRole`/`permission`/`workingDirectory`/`maxTurns`/`resume?`, no `Plan.agents` entry backs it) | `PlanMechanicalNode` (`mechanical` nodes — only an `action` string). A step node has no agent to resolve, so it carries no `agentName`/`inputTemplate` at all rather than emitting a lying empty string — the same reasoning the rounds/steps `Flow` split already applies at the schema level. Any code reading `node.agentName` unconditionally must narrow on `role`/`kind` first or it fails to compile; `packages/adapter-langgraph`'s `adapter.ts`/`node-executor.ts`/`graph-builder.ts` and `packages/ui/engine-flow/planToVisualNodes.ts` each carry a one-line compile-safety skip for the two new kinds — they do not execute or render agent-spawn/mechanical nodes yet, a different package does that.

**Conclusion** — final output from adapter (engine defines the shape, adapter produces it). Carries an optional `estimatedCostUsd?: number` — total estimated USD cost across all LLM calls in the session, when pricing is known for every model used.

---

## `steps[]` — the agent-spawn schema

`steps[]` is an XOR alternative to `rounds[]`: a Flow declares exactly one of the two, never both. Enforced by a `superRefine` in `flow-schema.ts` at parse time, and by `steps?: never` / `rounds?: never` sentinels on `Flow` and `StepsFlow` in `flow-types.ts` at the type level. `Flow` (rounds-shaped) keeps its existing name and shape unchanged — every current consumer keeps compiling with zero edits.

```ts
interface StepsFlow {
  schemaVersion: '2.0'
  id: string
  displayName: string
  description: string
  experimental: boolean
  benchmarked: boolean
  defaults: FlowDefaults
  agents: AgentRole[]          // { role: string } — declared roles, not LLM config
  steps: Step[]
  rounds?: never
}

type Step = AgentStep | MechanicalStep

interface AgentStep {
  id: string
  type: 'agent'
  role: string                 // must be declared in flow.agents
  promptTemplate: string
  permission: string
  workingDirectory: string
  maxTurns: number
  resume?: string               // must reference a prior step's id
  decision?: StepDecision       // examine/ifTrue/ifFalse/maxRevisions — see below
  dependsOn?: string[]           // see resolveStepDependsOn below
}

interface MechanicalStep {
  id: string
  type: 'mechanical'
  action: string
  decision?: StepDecision
  dependsOn?: string[]           // see resolveStepDependsOn below
}

interface StepDecision {
  examine: string                // step id whose result is examined
  ifTrue: string                 // step id to route to on the positive outcome
  ifFalse: string                // step id to route to on the negative/continue outcome
  maxRevisions: number           // >= 1
}
```

A `steps` entry describes how to *launch* an agent — role, permission scope, working directory, turn ceiling, prior session to resume — and nothing about what it does once running: no tool bindings, no binary name. The executor (a later task, a new package) binds `role` to an actual binary, since the binary present on one machine may be absent on another.

A step's optional `decision` names *which* step's result is examined and *where* each of two outcomes routes — bare step-id references only, never a `contains`/`equals`/`matches` predicate. The meaning of the outcome is resolved by the executor's caller at run time, the same way `role` is resolved to a binary rather than carried in the Flow. `compileFlow` carries a declared `decision` straight onto the compiled `PlanAgentSpawnNode`/`PlanMechanicalNode` as `PlanStepDecision` (types.ts), and `Plan.maxRevisions` becomes the real max of every step's `decision.maxRevisions` (`0` when none declare one). This is carried on the node, not pushed into `graph.conditionalEdges` — that list stays `[]` for the `agent-lifecycle` shape, since `PlanConditionalEdge`/`StateCondition`/`RevisionCondition` are closed unions scoped to the rounds shape's substring-match check and widening them would be a breaking change. `validateStepsFlow` rejects a `decision` whose `examine`/`ifTrue` is not an existing, strictly prior step id, whose `ifFalse` is not an existing step id, or whose `maxRevisions` is `< 1`.

A step's optional `dependsOn` names the ids of the steps it must wait on, forming a real fan-out/join dependency graph rather than a strictly linear chain. `resolveStepDependsOn(steps, index)` (`validate-flow.ts`) is the single source of truth for a step's effective dependencies, imported by both the compiler and the validator so they can never drift apart: an explicit `dependsOn` (including an explicit empty array) is used verbatim; an omitted one defaults to `[steps[index - 1].id]` for every step but the first, and to `[]` for the first. `validateStepsFlow` rejects a `dependsOn` entry naming a nonexistent step id and rejects a cycle in the resolved graph — general cycle detection, not a forward-reference restriction, since a dependency may legitimately point at a step declared later in the array. This is entirely independent of `decision`: `decision` is node-level routing metadata consumed only by the executor at run time, never represented as a `PlanEdge`, so the two features cannot interact and `dependsOn`'s acyclicity check never inspects `decision` fields.

`loadStepsFlow(yaml)` and `validateStepsFlow(flow)` (in `flow-loader.ts` / `validate-flow.ts`) are the steps-shape counterparts of `loadFlow` / `validateFlow`. Both are re-exported through `index.ts`, alongside `resolveStepDependsOn`, the `StepsFlow`/`AnyFlow`/`Step`/`AgentStep`/`MechanicalStep`/`AgentRole`/`StepDecision` types, and the Zod schemas behind them. They became public when a consumer outside this workspace first had to produce a steps-shaped Plan: `compileFlow` already accepted `AnyFlow`, so the compiler was reachable, but without the loader and the types a caller could neither parse a steps-shaped YAML nor give an object literal a type — the shape was compilable and unspeakable at the same time.

`compileFlow` compiles a `StepsFlow` into the `agent-lifecycle` shape (see Shape Detection and Node ID Scheme below) — one `PlanAgentSpawnNode`/`PlanMechanicalNode` per step, validated by `validateStepsFlow` rather than `validateFlow`'s rounds-only rules. `Plan.agents` is left empty for this shape: `AgentRole` (`{role: string}`) carries no `systemPrompt`, so there is no real `Agent` record to build, and the agent-spawn executor resolves a step's declared role to a binary from its own caller-supplied configuration, never from `Plan.agents`.

---

## Shape Detection (pragmatic compromise)

`compileFlow` detects the flow's shape from its topology and emits matching v1 Plan node ids. This is a deliberate pragmatic weakening of the architectural ideal ("engine has zero branches"): the adapter and route handler depend on the v1 node-id conventions, so the compiler preserves them.

| Shape | Detection rule | Node ids emitted |
|-------|---------------|------------------|
| `solo` | `rounds.length === 1 && rounds[0].agents.length === 1` | `solo` |
| `brokered-no-synth` | Last round has >1 agent AND no round has `onFailure.action === 'revise'` | `reviewer-{AgentName}` for each |
| `brokered-synth` | `rounds.length >= 2 && rounds[rounds.length-1].agents.length === 1` AND no `onFailure.action === 'revise'` | `reviewer-{AgentName}` for each reviewer + `brokered-synthesis` |
| `rounds-audit` | Any round has `onFailure.action === 'revise'` | `round-{r}-{AgentName}`, `terminal-{k}`, `audit-{Name}-{k}`, `__END__` |
| `agent-lifecycle` | The Flow is `steps`-shaped (has `steps[]`, not `rounds[]`) | The step's own declared `id`, verbatim, for every step |

A future refactor (OQ-I in `vada-state.md`) could rewrite `compileFlow` as a generic walker emitting round-id-namespaced ids, but the adapter and route handler would need updating in lockstep. Captured as a known compromise, not a regression. The `agent-lifecycle` shape sits outside this compromise entirely — it has no v1 node-id convention to preserve, so its ids are simply the step's own id.

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
| Agent-spawn / mechanical step (`agent-lifecycle` shape) | the step's own declared `id`, verbatim | `review`, `apply-patch` |

`slotIndex` increments with each revision cycle. The conditional edge from the last auditor of a slot wires to either the next `terminal-{slotIndex+1}` (revise path) or `__END__` (accept path) based on `anyOf` evaluation of audit outputs against the `RevisionCondition`. Steps carry no such convention — each step already declares its own unique `id` (uniqueness enforced by `validateStepsFlow`), so the compiler reuses it rather than inventing a synthetic numbering scheme. Edges between steps are resolved-dependency edges, not a fixed chain: a step with no explicit `dependsOn` gets one `flow` edge from its immediate predecessor (the byte-identical-to-a-chain default); a step that declares `dependsOn` gets one `flow` edge per named dependency, in any position — declaration order does not constrain the dependency graph, only cycles are rejected.

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
const node = { id, kind: 'solo-agent', agent: agent.name }

// ❌ Engine should never add content
const node = { id, kind: 'solo-agent', agent: agent.name,
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

The generic flow refactor's second PR removed the option of adding a new compiler. There is no `compilers/` directory anymore — `compileFlow` is the only entrypoint. New deliberation patterns are expressed as YAML.

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

**This workflow is for rounds-shaped (deliberation) flows only.** A `steps`-shaped (`agent-lifecycle`) Flow is not a deliberation and is never dropped into `packages/agents/vada-deliberation/yamls/` — that directory is exactly what `listPublicSpecs()`/the catalog loader globs (see `catalog-loader.ts`), so anything placed there is auto-discovered as a real published flow. A `steps`-shaped Flow spawns external agent processes and mechanical commands instead — see `.claude/skills/atta-adapter-langgraph/SKILL.md`'s "The executor split" for the package that runs it (`packages/executor-agent-spawn`, a sibling to the adapter, not an extension of it). `packages/executor-agent-spawn/src/agent-spawn-proof.fixture.ts` and `scripts/run-agent-spawn-proof.ts` are the end-to-end proof that a `steps`-shaped Flow compiles (via this package's own `compileFlow`) and executes for real: one `agent-spawn` step (a real spawned process, no vendor SDK) and one `mechanical` step, composed through the executor. Deliberately not a catalog `.yaml` and not a `bun test` suite — see that script's own header comment for why.

---

## Anti-patterns

- ❌ Runtime dependencies in engine (fetch, SDKs, state machines)
- ❌ Mutating `Plan` objects after compilation
- ❌ Validation inside `compileFlow` (belongs in `validateFlow`, called by `loadFlow`)
- ❌ Content injection (prompts, examples) into compiled Plans
- ❌ `Agent.tools` as boolean — use `string[]` always, `[]` for explicit none
- ❌ Renaming node IDs without grepping adapter + mcp-server + `flow-helpers.ts` for dependencies
- ❌ Importing `loadSpec` / `compileSpec` / `specToTeam` / `Team` / `Workflow` from `@atta/engine` — those exports were deleted in the generic flow refactor
- ❌ Reintroducing per-shape compilers (`compilers/solo.ts`, etc.) — the generic flow refactor collapsed them deliberately
- ❌ Treating `MAX_REVISIONS` as a failure — it's a valid terminal state
- ❌ Adding new terminal states without Principal approval (contract with adapter + mcp-server)
- ❌ Calling internal helpers (`buildRevisionCondition`, `detectShape`, `buildPlan`) from outside the engine — use `compileFlow`
- ❌ Importing from `@vada/teams` — that package was deleted long before the generic flow refactor
- ❌ Setting `signal.type` to `'equals'` or `'matches'` in a YAML — engine throws explicitly. The schema reserves them; the compiler doesn't ship them yet.
- ❌ Pointing `main`/`types`/`exports` back at `src/` in any of the three packable manifests — that makes the distribution contract "have this repository"
- ❌ Dropping `^build` from `turbo`'s `typecheck` task — every consumer's typecheck and every consumer's `vitest` run then fail on a clean checkout, because nothing else in the task graph builds `dist/` first
- ❌ Replacing that dependency with an emit inside a package's `typecheck` script — a task declaring no `outputs` restores no files on a cache hit, so the emit silently stops happening and the failure surfaces in CI rather than locally
- ❌ `npm pack` for these packages — it leaves `workspace:` ranges in the packed manifest, and the artifact is uninstallable
- ❌ Adding `"sideEffects": false` to any of the three packable manifests — bun 1.3.14's bundler tree-shakes re-exports like `listPublicSpecs` straight out of `dist/index.js`
- ❌ Adding a fourth package to the artifact set without a consumer that needs it, or dropping `@atta/agents` from it — the engine's declarations name it

---

## When you need more context

- v2 schema reference (top-level fields, round fields, on_failure, all 10 validation rules, template variables, worked examples for all 4 shapes): `apps/vada-ai/specs/yaml-schema-reference.md`
- Design rationale for the universal round-based schema, pragmatic weakenings, deferred PR 3 / PR 4: `apps/vada-ai/specs/generic-flow-refactor.md`
- Adapter-side execution + SDK-shape dispatch: **atta-adapter-langgraph** skill
- YAML authoring recipes by shape: **vada-yaml-authoring** skill
- Spec registry + MCP exposure: **vada-mcp-server** skill
- Architecture overview + locked decisions table: **vada-architecture** skill
- Ecosystem framing (AttaLabs / Atta / @atta packages — the engine lives under AttaLabs): root `CLAUDE.md`'s naming bullets
