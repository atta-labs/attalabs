---
name: atta-engine
description: Vāda engine internals — Plan compilation, Agent/Workflow/Team types, validation rules, terminal states, and immutability invariants. Load when working inside packages/engine or debugging unexpected Plan graph structure. Do NOT load for adapter/router/provider runtime work.
---

# `@atta/engine` — Plan Compiler

## Context

`@atta/engine` is a **pure library**. It takes a `DeliberationSpec` (from a YAML file) and compiles it into a Plan: a declarative JSON-serializable execution DAG. Zero runtime dependencies. The engine compiles; the adapter executes. These responsibilities never cross.

The engine has no LangGraph, no Anthropic SDK, no fetch, no LangChain. If you're importing a runtime dependency here, you're in the wrong package.

The authoring interface is: YAML file → `loadSpec()` → `DeliberationSpec` → `compileSpec()` → `Plan`. Direct TypeScript Team/Workflow construction is no longer the public API.

---

## Architecture

```
YAML file
    ↓
loadSpec(yaml: string)       parse + Zod validation
    ↓
DeliberationSpec             in-memory typed spec
    ↓
compileSpec(spec, question)  internally: specToTeam → compile
    ↓
Plan (JSON DAG)
    ↓
[handed to adapter]
```

File tree:

```
packages/engine/src/
├── types.ts                  # Agent, Workflow, Team, Plan, Conclusion, ToolDecision (internal)
├── spec-types.ts             # DeliberationSpec, SpecAgent, FlowSpec, ReviewerSpec (public)
├── spec-schema.ts            # Zod validation schema
├── spec-loader.ts            # loadSpec(yaml: string) → DeliberationSpec
├── validate.ts               # Preflight validation before compilation (internal)
├── compilers/
│   ├── spec.ts               # compileSpec(spec, question, model?) → Plan; specToTeam(spec) → Team
│   ├── solo.ts               # SoloWorkflow → Plan (internal)
│   ├── rounds.ts             # RoundsWorkflow → Plan (internal, most complex)
│   └── custom.ts             # CustomWorkflow → Plan (internal)
└── index.ts                  # Public exports
```

---

## Public API (Phase 7.2+)

```ts
import { loadSpec, compileSpec, specToTeam } from '@atta/engine'
import type { DeliberationSpec, SpecAgent, FlowSpec, ReviewerSpec } from '@atta/engine'
```

| Export | Purpose |
|--------|---------|
| `loadSpec(yaml: string)` | Parse + validate YAML → `DeliberationSpec`. Throws on schema violations. |
| `compileSpec(spec, question, model?)` | `DeliberationSpec` → `Plan`. `model` overrides `spec.defaults.model`. |
| `specToTeam(spec)` | `DeliberationSpec` → `Team` (internal team shape). Used internally by `compileSpec`. |
| `DeliberationSpec` | Top-level YAML spec type |
| `SpecAgent` | Per-agent config in a spec |
| `FlowSpec` | Rounds + synthesis + audit flow config |
| `ReviewerSpec` | Per-reviewer config (brokered mode) |

`compile()` is NOT a public export. It remains internal. Call `compileSpec()` instead.

---

## Core Types

**DeliberationSpec** — the input. Produced by `loadSpec()`.
```ts
interface DeliberationSpec {
  schemaVersion: '1.0';
  id: string;
  displayName: string;
  description: string;
  experimental: boolean;
  benchmarked: boolean;
  defaults: { model: string; maxTokens?: number };
  agents: SpecAgent[];
  flow?: FlowSpec;        // rounds-based mode
  reviewers?: ReviewerSpec[];  // brokered mode
  response?: ResponseSpec;
}
```

**SpecAgent**
```ts
interface SpecAgent {
  name: string;           // PascalCase, unique within spec
  description: string;
  systemPrompt: string;
  model?: string;         // overrides spec defaults
  maxTokens?: number;
  tools?: string[];       // [] for tool-off, absent = no tools
  outputFormat?: 'text' | 'structured';
  outputSchema?: Record<string, unknown>;
  classifier?: { mode: ClassifierMode; budget?: number };
}
```

**ClassifierMode**
```ts
type ClassifierMode = 'auto' | 'skip' | 'always_tools'
// 'auto'         — classifier decides at runtime
// 'skip'         — no classifier injected, no tools
// 'always_tools' — classifier skipped, agent's full tool list always on
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
export function compileSpec(spec: DeliberationSpec, question: string, model?: string): Plan {
  const team = specToTeam(spec);
  validate(team.workflow, team);
  return compile(team.workflow, team, question);
}

// ❌ Engine should never do this
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
```

### Plans are Immutable After Compilation

Never modify a Plan after `compileSpec()` returns. No "enrichment passes." If the adapter needs extra data, it lives in LangGraph state, not in the Plan.

```ts
// ✅ Compute once, return
const plan = compileSpec(spec, question);
return plan;

// ❌ Never mutate
const plan = compileSpec(spec, question);
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
// ✅ Agent's systemPrompt comes from the spec
const node = { id, kind: 'agent', agent: agent.name };

// ❌ Engine should never add content
const node = { id, kind: 'agent', agent: agent.name,
               systemPromptOverride: 'You must also...' };
```

### `tools: string[]` is the Contract

Never change `SpecAgent.tools` to boolean. The adapter's tool registry maps logical names → Anthropic API types. Boolean erases that mapping.

```ts
// ✅
tools: ['web_search', 'web_fetch']
tools: []                    // explicit no-tools

// ❌
tools: true                  // breaks registry mapping
```

### Parallel Auditors via YAML `audit.agents` array

`FlowSpec.audit.agents` accepts multiple agent names. All run in parallel; ANY flag triggers revision. Matches `logic: any` in YAML.

```yaml
# Single auditor
audit:
  agents: [BlindCritic]

# Parallel auditors — logical + factual
audit:
  agents: [BlindCritic, FactChecker]
  revision:
    logic: any
```

---

## Adding a New Workflow Variant

Phase 7.2+: new workflow variants are created as YAML files, not TypeScript compilers.

1. Create `apps/vada-ai/yamls/<new-spec>-v1.yaml` following the schema
2. Register in `apps/vada-ai/mcp-server/src/spec-registry.ts`
3. Write a verify script in `apps/vada-ai/web/scripts/verify-<new-spec>-port.ts`
4. Run verify script; confirm transcript length matches expected count

If you need a genuinely new internal execution shape (e.g. a new `kind` of Workflow), then also:
- Add `kind` to `Workflow` union in `types.ts`
- Create `compilers/<kind>.ts` exporting `compile(workflow, team): Plan`
- Update `validate.ts` to handle new kind
- But this is engine internals — the YAML author never needs to do this

---

## Anti-patterns

- ❌ Runtime dependencies in engine (fetch, SDKs, state machines)
- ❌ Mutating `Plan` objects after compilation
- ❌ Validation inside compilers (belongs in `validate.ts`, upstream)
- ❌ Content injection (prompts, examples) into compiled Plans
- ❌ `SpecAgent.tools` as boolean — use `string[]` always, `[]` for explicit none
- ❌ Renaming node IDs without grepping adapter + mcp-server for dependencies
- ❌ Treating `MAX_REVISIONS` as a failure — it's a valid terminal state
- ❌ Adding new terminal states without Principal approval (contract with adapter + mcp-server)
- ❌ Calling `compile()` directly from outside the engine — use `compileSpec()`
- ❌ Importing from `@vada/teams` — that package is deleted; use YAML + `loadSpec` + `compileSpec`

---

## When you need more context

- Why `tools: string[]` and not boolean: `apps/vada-ai/specs/engine/design-decisions.md`
- Adapter-side execution: **atta-adapter-langgraph** skill
- Agent definitions and YAML authoring: **atta-teams** skill + **vada-yaml-authoring** skill
- YAML schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`
