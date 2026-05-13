# Generic Flow Refactor — Design

**Status:** Implementation complete — ratified via D-033, shipped May 12-13, 2026
**Implementation PRs:** #41 (schema + types + validation), #47 (compileFlow + migration + consumer updates), D-034 cleanup PR (signal rejection + RevisionCondition single-variant)
**Author:** Claude (Critic/Synthesizer) with Dani (Principal)
**Date:** May 12, 2026 (drafted); May 13, 2026 (marked complete)
**Branch:** `design/generic-flow-refactor` (design doc); `feat/generic-flow-refactor-pr1`, `feat/generic-flow-refactor-pr2` (implementation)
**Scope:** Stack-wide. New YAML schema → engine compiler → MCP server → web route handler → UI renderer. All 9 catalog YAMLs migrated.

## Implementation status (added May 13, 2026)

**Shipped:**
- PR #41 — Schema + types + validation. `flow-types.ts`, `flow-schema.ts` (schema_version `'2.0'`), `validate-flow.ts` (164 lines, 10 rules), `__tests__/validate-flow.test.ts` (590 lines), `index.ts` exports. 108 tests pass.
- PR #47 — Greenfield `compileFlow` (386 lines) with shape detection emitting the same Plan node ids the adapter expects (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`). All 9 YAMLs migrated to `schema_version: "2.0"`. Old code deleted: `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `compile.ts`, all `compilers/*.ts`. The `Team`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, and `Workflow` discriminated union deleted from `types.ts`. 29 consumer files updated: route handler, both MCP tool files, 6 UI components reading the spec shape, verify scripts, `apps/vada-ai/web/src/lib/flow-helpers.ts` (new, 39 lines, shared shape detection for the UI). Bug fix: `vada-reviewers-synthesis` synthesis template now uses `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}` (was `{{reviewerResponses}}`, which the engine never populated — the synthesizer ran blind in production).
- D-034 cleanup PR — `compile-flow.ts` `buildRevisionCondition` throws explicitly on unsupported signal types instead of silently treating `equals`/`matches` as `contains`. `RevisionCondition` in `types.ts` collapsed to single-variant interface (`type: 'contains'`); unused `json-field-equals` and `json-field-truthy` variants removed; adapter switch tables in `adapter.ts` and `graph-builder.ts` lost their dead case blocks.

**Pragmatic weakenings from the original design (honestly captured):**

1. **Shape detection in compiler, not generic walker.** The D-033 ideal was "one compiler with zero branches on shape." In practice, `compileFlow` contains a `switch (shape)` over four detected shapes (`solo`, `brokered-no-synth`, `brokered-synth`, `rounds-audit`) and emits matching v1 node ids so the adapter and route handler can execute the graph identically. Reason: the adapter, route handler, and UI all depend on the v1 node-id conventions; a generic walker would have required updating all of them in lockstep. The schema layer is fully generic (one shape, no discriminators); the compiler keeps shape detection for v1 compatibility. Captured as OQ-I in `vada-state.md`.

2. **`TemplateState` left on v1 shape.** The design doc proposed round-namespaced template variables (`rounds.<id>.outputs`, `currentRound.prior_agents`, `revision.source_outputs`, etc.). PR #47 left the adapter's `TemplateState` and `deriveTemplateState` unchanged — v2 YAMLs use the v1 variable names (`outputsByRound`, `lastOutputByAgent`, `currentRoundOutputs`, `allPreviousOutputs`, `conclusion`, `auditOutputs`, etc.). The migration of v1 YAMLs to v2 schema preserved their templates verbatim. The round-namespaced refactor is captured as OQ-H in `vada-state.md` and is future work.

3. **SSE events still match v1 semantics.** PR 3 (MCP server `agent_config` rename + new SSE events `round_started` / `round_completed` / `revision_started` replacing `state_changed: ROUND_N | CONCLUDING | AUDITING | REVISING`) was specified in this design doc but not shipped in #47. The route handler still emits the v1 event shape; the UI still subscribes to it. PR 3 is queued as a separate dispatchable change. The current event names work — they're just less aligned with the v2 mental model than they could be.

4. **UI rewrite (PR 4) not shipped.** The `FlowFeed` / `RoundColumn` / `AgentGrid` / `AgentChain` / `AgentCard` component refactor described below was scoped but deferred. The existing `RoundStrip` UI continues to render v2-compiled Plans correctly via the unchanged adapter and the v1 SSE events. The "Agents are getting ready…" empty-state bug that motivated the UI rewrite is still latent; it surfaces only on `brokered-no-synth` shapes during the period before `agent_completed` events arrive. Captured as a known issue to address in PR 4.

**Net outcome:** The schema and engine layer fully ship the v2 model. The adapter, SSE, and UI layers remain on v1 framing — they read the v2-compiled Plan correctly because `compileFlow` emits v1-compatible node ids and the adapter is unchanged. Future PRs 3 and 4 close the loop. The pragmatic compromise was deliberate: ship the schema migration cleanly across all consumers in a single PR (#47) rather than partial migrations across many PRs.

---

## Purpose

Today's YAML schema describes three structurally distinct flow shapes:

- **Brokered-no-synthesis** (`vada-reviewers`): `reviewers:` top-level array, no `flow:` block
- **Brokered-with-synthesis** (`vada-reviewers-synthesis`): `reviewers:` top-level array, `flow.synthesis:` block
- **Rounds-based** (`sparring`, `crucible`, `war-room`): `flow.rounds:`, `flow.synthesis:`, `flow.audit:` blocks; no top-level `reviewers:`

The engine has separate compilers for each. The MCP server has special-casing. The web UI is hardcoded to the rounds-era shape and doesn't render single-round brokered teams correctly (Bug #1 from the May 11 audit — "Agents are getting ready…" stays visible for the entire run even though three reviewers complete).

This refactor collapses everything into one universal shape: **a flow is a sequence of rounds**. Each round has agents, layout, name, and failure semantics. Synthesis is just a round with one agent. Audit is just a round. Revision is declarative — any round can declare it triggers a re-run of an earlier round on a defined signal.

The win:
- One YAML schema. Authoring a new team is one structure.
- One engine compiler. New flow patterns are YAML changes, not code changes.
- One MCP server input shape. Same for hosted and local.
- One UI renderer. Adding a flow shape is zero UI work.
- Cleaner mental model for everyone (you, Claude, executors, future contributors).

This is Path β from the prior design doc (the abandoned UI-only Path α). The refactor touches the entire stack precisely because piecemeal cleanup leaves the schema as a permanent bug-magnet.

> **What actually shipped (post-implementation note):** Items 1, 2, and 3 above shipped fully. Item 4 (one UI renderer) is partial — the UI continues to render v2 Plans correctly but uses v1 components; the unified renderer is PR 4 work. Item 5 (cleaner mental model) shipped at the schema and engine layer; the adapter and UI carry residual v1 vocabulary.

---

## The conceptual model

> *Reference for the schema as shipped. Subset of this lives at `apps/vada-ai/specs/yaml-schema-reference.md` (the canonical authoring reference).*

```
Flow {
  id, display_name, description, experimental, benchmarked, defaults, agents
  rounds: Round[]                    // 1 or more rounds, in order
}

Round {
  id              string             // unique within the flow
  name            string             // display name shown in UI ("Reviewers", "Sparring", "Synthesis", "Audit")
  agents          AgentInRound[]     // 1 or more agents (ordered if layout=serial; set if layout=parallel)
  layout          'parallel' | 'serial'
  repeats         number             // defaults to 1 — how many times this round runs back-to-back
  message_template?  string          // ROUND-LEVEL TEMPLATE — default for all agents in this round
  agent_failure   'abort' | 'continue'    // if one agent fails, do we abort the round or continue?
  on_failure?     OnFailureSpec      // what to do if this round emits a "failure signal" (see below)
}

AgentInRound {
  name            string             // references an entry in the flow's top-level `agents` array
  message_template?  string          // OPTIONAL — overrides the round's message_template for this agent only
}

OnFailureSpec {
  action          'abort' | 'continue' | 'revise'
  target?         string             // round id to re-run (required if action='revise')
  max_revisions?  number             // how many times we'll retry (required if action='revise', defaults to 1)
  signal          { type: 'contains' | 'equals' | 'matches', value: string, case_sensitive?: boolean }
}

// The top-level `agents` array still holds the full agent definitions (name, model, system_prompt, tools, classifier, output_format, output_schema).
// Round entries reference these by name and may override only the message_template (the per-call input).
// The system_prompt, model, tools, etc. always come from the top-level definition — never overridable per round.
```

The flow runs rounds in order. Each round receives the accumulated flow state (original prompt + all prior round outputs) and produces a new array of outputs. The flow's final output is the last round's output.

Within a round:
- `layout: parallel` — all agents run independently with no cross-visibility within the round (current brokered behavior)
- `layout: serial` — agents run in order, each seeing the prior agent's output within the same round repeat (current rounds-based behavior)
- `repeats: N` — the round runs back-to-back N times. Each repeat sees all prior repeats' outputs. (This is what sparring/crucible/war-room do — "3 rounds" in today's vocabulary is one round with `repeats: 3`.)

Revision is declarative:
- A round declares `on_failure: { action: 'revise', target: 'synthesis', max_revisions: 1, signal: { type: 'contains', value: 'FLAG' } }`
- When the round completes, the engine checks the signal against any agent's output
- If matched, it re-runs the targeted round with the failed round's output as additional input
- `max_revisions` caps the loop

This generalizes today's hardcoded audit→synthesis revision loop. Future flows can declare more complex retry patterns without engine code changes.

> **As shipped:** the schema reserves `type: 'equals'` and `type: 'matches'` for forward extensibility. The engine implements `contains` only (D-034). `compileFlow` throws explicitly on `equals` or `matches`. No catalog YAML uses anything but `contains` today.

---

## Data flow — how rounds connect to each other

> **Status: design intent; not yet shipped at the adapter layer (OQ-H).** PR #47 preserved the v1 `TemplateState` shape and migrated v2 YAMLs to use the v1 variable names. The round-namespaced context described below is the eventual target.

The engine threads state from one round to the next via a **uniform Handlebars template context**. Each round's `message_template` is rendered against this context before being sent to the round's agents.

### What's in the template context (target shape)

At any round, the template would have access to:

| Variable | Type | Description |
|---|---|---|
| `question` | string | The original user input (the brief) |
| `rounds.<round_id>.outputs` | array | All agent outputs from a completed prior round. Each entry: `{ agent: string, content: string, structured?: object, error?: string }`. Available only for rounds that have completed. |
| `rounds.<round_id>.repeats[N].outputs` | array | For multi-repeat rounds, the outputs from each individual repeat. `repeats[0]` is the first repeat, etc. |
| `currentRound.prior_agents` | array | For serial-layout rounds: agents in the current round that have already run in this repeat. Empty for the first agent. Same shape as `rounds.<id>.outputs`. |
| `currentRound.repeat_index` | number | For multi-repeat rounds: which repeat we're currently in (0-based) |
| `revision.source_round_id` | string \| undefined | When the round is being re-run via `on_failure: revise`, the id of the round whose signal triggered the revision |
| `revision.source_outputs` | array \| undefined | The outputs of the source round that triggered the revision (e.g., the audit's FLAG output) |
| `revision.index` | number \| undefined | The revision attempt counter (0 = original run, 1 = first revision, etc.) |

Custom variables defined at the flow level (e.g., `customVars.domain` for the Domain Expert) remain accessible as `customVars.<name>`.

### What ships today (v1 TemplateState — see OQ-H)

v2 YAMLs use the v1 variable names listed in `apps/vada-ai/specs/yaml-schema-reference.md` Template Variables section: `{{outputsByRound.[0]}}`, `{{currentRoundOutputs}}`, `{{lastOutputByAgent.AgentName}}`, `{{allPreviousOutputs}}`, `{{conclusion}}`, `{{auditOutputs}}`, `{{isRevision}}`, `{{participants}}`. The round-id namespacing above is the deferred target; the adapter refactor that introduces it is captured as OQ-H.

### How a round references prior round outputs (target shape)

The round's `message_template` references the data it needs by id:

```yaml
- id: synthesis
  name: Synthesis
  agents: [Synthesizer]
  message_template: |
    Question: {{question}}
    Reviewer responses:
    {{#each rounds.review.outputs}}
    [{{this.agent}}] {{this.content}}
    {{/each}}
    Please synthesize.
```

The template is the contract. The data flow is invisible in the round's structure (no `inputs:` declaration), but the template makes it readable. The engine populates `rounds.review.outputs` automatically once the `review` round completes; if the template references `rounds.someNonExistentRound.outputs`, the variable resolves to `undefined` and the template renders an empty section.

### Why implicit-template-context (Option A) and not explicit `inputs:` (Option B)

The schema could require each round to declare `inputs: { reviewer_responses: rounds.review.outputs }` and the template would only see what's declared. This would make data flow validatable and explicit. It's the architecturally cleaner choice.

For v1 of this refactor we go with Option A (implicit) for three reasons:

1. **Today's engine already works this way.** Migration doesn't require touching template content beyond the round-shape changes.
2. **YAML schema weight.** Adding `inputs:` doubles the round-spec surface area for a benefit that's only visible at validation time, not at runtime.
3. **Easy to upgrade later.** Adding `inputs:` as an optional field in a future PR is non-breaking — when present, validate it; when absent, fall back to implicit.

This is captured as future work in the post-refactor backlog.

---

## Within-round input model — `message_template` at round vs agent level

**Decision:** `message_template` lives on the round (default for all agents) with optional per-agent override. **Shipped as designed.**

Validation Rule 8 enforces: a round must have either a round-level `message_template` OR every agent in the round must have its own. Rounds where neither is present are rejected.

The full reasoning, examples, and "round-level template is the default; agent-level template overrides" semantics in the original design doc carried over verbatim into the schema. See `yaml-schema-reference.md` for the canonical reference.

---

## Mapping each current YAML to the new schema

> **Status: all 9 YAMLs migrated in PR #47.** Final shipped YAMLs at `apps/vada-ai/yamls/*.yaml`. Inspect the live files for the production templates; the snippets below capture the design-time mapping intent.

### `vada-reviewers` — 1 round (brokered-no-synth)
1 round, layout `parallel`, 3 agents, `message_template: "{{question}}"`. Final YAML preserves all reviewer system prompts verbatim.

### `vada-reviewers-synthesis` — 2 rounds (brokered-synth)
Round 1 = parallel reviewers (as above). Round 2 = single-agent serial synthesis round. Bug fix in PR #47: synthesis template changed from `{{reviewerResponses}}` (never populated) to `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}`.

### `sparring` — 3 rounds (rounds-audit) — `debate` (repeats: 3), `synthesis`, `audit`
Debate uses `repeats: 3` and serial layout. Synthesis is a single-agent serial round. Audit has `on_failure: { action: revise, target: synthesis, max_revisions: 1, signal: { type: contains, value: FLAG } }`.

### `crucible` — same shape as sparring with 4 debate agents
### `war-room` — same shape as sparring with 6 debate agents

### `a0-baseline`, `a1-baseline` — 1 round, 1 agent (solo)

### `brokered-trio`, `brokered-quartet` — same shape as `vada-reviewers`, different agent counts (brokered-no-synth)

**Every YAML in the catalog fits one structure.** Adding a new flow is "describe its rounds in YAML." Zero engine code, zero UI code.

---

## Cross-stack changes

### Schema + types (`@atta/engine`) — shipped in PR #41
- New TypeScript types in `packages/engine/src/flow-types.ts`: `Flow`, `Round`, `AgentInRound`, `OnFailureSpec`, `FailureSignal`, `FlowAgent`
- Deleted in PR #47: `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, the `Workflow` discriminated union, `Team`
- New: `validateFlow(flow)` enforcing 10 rules (see `validate-flow.ts`)
- Validation rules shipped as designed.

### Engine compiler — shipped in PR #47
- One entrypoint: `compileFlow(flow, question, model?, customVars?) → Plan` in `packages/engine/src/compile-flow.ts`
- Replaces: `compileBrokered`, `compileRounds`, `compileSolo`, `compileCustom` (all deleted)
- Plan structure preserved — `PlanNode` + `PlanEdge` + `PlanConditionalEdge` unchanged.
- For `on_failure: { action: 'revise', target, max_revisions }`, the compiler pre-allocates `terminal-{k}` nodes for k from 0 to max_revisions, and pre-allocates audit slots for each terminal. Conditional edges wire `audit-{lastAuditor}-{k}` → `terminal-{k+1}` (if signal) or `__END__` (otherwise).

### MCP server — partially shipped
- `vada__consult` and `vada__deliberate` continue to operate on the same input shapes — they pass through to `compileFlow` and the v1 Plan node ids are emitted unchanged.
- `reviewer_config` → `agent_config` rename: **NOT YET SHIPPED.** Queued as PR 3.

### Web route handler — shipped in PR #47
- Reads the new schema via `loadYamlFromCatalog` and the v2-aware `validateAllSpecs` at startup.
- Calls `compileFlow` instead of the old per-workflow compilers.
- Continues to construct `agentVendorOverrides` for D-032 sdkShape dispatch.
- SSE events: still emit v1 names (`agent_completed` with integer `round` field, `state_changed`, `synthesis_complete`, `terminal`). PR 3 work.

### UI — partially shipped
- `apps/vada-ai/web/src/lib/flow-helpers.ts` (new, 39 lines) provides shape detection for the UI: `detectShape`, `getDisplayAgentNames`, `getFlowAgentCount`, `getFlowShapeLabel`. Consumed by `DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, `calculator.ts`.
- The existing `RoundStrip` components continue to render v2-compiled Plans correctly because the adapter emits v1-shape node ids and SSE events.
- New `FlowFeed` / `RoundColumn` / `AgentGrid` / `AgentChain` / `AgentCard` components: **NOT YET SHIPPED.** Queued as PR 4.

### Decision log entry
D-033 in `apps/vada-ai/specs/vada-decisions.md` — ACTIVE. D-034 (cleanup) follows.

A global D-017 in `project-management/decisions.md` references D-033 as a cross-product architectural decision (added in this docs cleanup PR).

---

## Rollout — 4 PRs sequenced

Original sequencing was 4 PRs. Two shipped, two deferred.

### PR 1 — Schema + types + validation ✅ SHIPPED
PR #41. As specified.

### PR 2 — `compileFlow` + YAML migration ✅ SHIPPED
PR #47. As specified, with the following deltas from the original plan:
- Migrated 9 YAMLs (the design doc said 9; the figure is correct)
- Deleted old types in the same PR rather than after (Principal rejected the proposed backwards-compat shim)
- Updated 29 consumer files in the same PR (route handler, MCP tool files, 6 UI components, verify scripts, new `flow-helpers.ts`)
- Bug fix: `vada-reviewers-synthesis` synthesis template (was `{{reviewerResponses}}`, never populated)

### PR 3 — MCP server + route handler + new SSE events — DEFERRED
Specified in this design doc but not shipped in #47. Queued as separate work. Scope:
- `vada__consult` and `vada__deliberate` `reviewer_config` parameter renamed to `agent_config` (validated against vendor registry, same shape, name-only change)
- Route handler emits new SSE event names (`round_started`, `round_completed`, `revision_started`) and drops the old special-cased states (`state_changed: ROUND_N | CONCLUDING | AUDITING | REVISING`)
- Temporary dual emission to let PR 4 land independently

### PR 4 — UI rewrite — DEFERRED
New components (`FlowFeed`, `RoundColumn`, `AgentGrid`, `AgentChain`, `AgentCard`, `useFlowState`). Subscribes to PR 3's new SSE event names. Drops the existing `RoundStrip` / `Round` / `RoundView` / `useRoundStrip` components.

### D-034 cleanup ✅ SHIPPED
Mechanical follow-up identified during PR #47 diff review:
- `compile-flow.ts` `buildRevisionCondition` throws on unsupported signal types instead of silently treating `equals`/`matches` as `contains`
- `RevisionCondition` in `types.ts` collapsed to single-variant interface
- Adapter switch tables in `adapter.ts` and `graph-builder.ts` lost their dead `json-field-equals` / `json-field-truthy` case blocks (scope expansion from the original 3-file brief to 5 files after stop condition triggered)

---

## Open questions for Principal review — resolutions

**OQ-1 — `agent_failure` defaulting.** ✅ Resolved as proposed. Default: `continue` for `parallel`, `abort` for `serial`. Override per round. Implemented as Rule 10 / `resolveAgentFailure()`.

**OQ-2 — Round names vs round ids.** Resolved as `round_id` (string) is canonical at the schema layer. SSE event shape is **deferred to PR 3** — still v1 (integer `round` field) today.

**OQ-3 — How does the UI label round repeats?** Deferred to PR 4 (UI rewrite).

**OQ-4 — Does `agent_config` still target by agent name only?** Resolved as flat `Record<agentName, modelId>`. Rename from `reviewer_config` deferred to PR 3.

**OQ-5 — `output_format: structured` agents.** Resolved. `AgentOutput.structured` field carries the parsed structured payload. SSE event renaming (`synthesis_complete` → `agent_completed` with `structured` field) deferred to PR 3.

**OQ-6 — `display_name`/`description` apply to flow, round, or both?** Resolved: round has `name` (required), no `description` field. Flow has both. Schema implemented.

**OQ-7 — Audit "FLAG" signal robustness.** Resolved: keep `contains` for v1. `equals` and `matches` reserved in schema but rejected by engine (D-034). Future work to implement.

**OQ-8 — Empty rounds.** ✅ Resolved. Validation Rule 9 rejects.

**OQ-9 — Inline vs referenced agent definitions in rounds.** ✅ Resolved. Reference by name.

**OQ-10 — Migration of existing sessions.** ✅ Resolved. No data migration needed; `spec_id` is a stable identifier.

New open questions surfaced during implementation:

- **OQ-H** (`vada-state.md`) — Adapter refactor to round-namespaced TemplateState. Future work.
- **OQ-I** (`vada-state.md`) — Shape detection in `compileFlow` vs generic walker. Currently shape detection; could be revisited when adapter is refactored.
