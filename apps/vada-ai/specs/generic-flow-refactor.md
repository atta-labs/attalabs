# Generic Flow Refactor — Design

**Status:** Ratified and shipped.
**Author:** Claude (Critic/Synthesizer) with Dani (Principal)
**Date:** May 12, 2026 (amended) / May 13, 2026 (post-implementation update)
**Branches:** `design/generic-flow-refactor` (this doc), `feat/generic-flow-refactor-pr1` (PR #41), `feat/generic-flow-refactor-pr2` (PR #47), `chore/d033-signal-and-revision-cleanup` (PR #48)
**Scope:** Stack-wide. New YAML schema → engine compiler → all 9 catalog YAMLs migrated. PR 3 (MCP `agent_config` rename + new SSE events) and PR 4 (UI rewrite) deferred — see "Implementation Status" below.

---

## Implementation Status (post-merge update, May 13, 2026)

The generic flow refactor is **implemented and shipped across PRs #41, #47, and #48** with the following pragmatic deviations from the original design captured here for the record.

### What shipped

- **PR #41** — Schema + types + validation. `Flow`, `Round`, `AgentInRound`, `OnFailureSpec` types in `packages/engine/src/flow-types.ts`. Zod schema in `flow-schema.ts`. `validateFlow` enforcing the 10 v2 schema rules + 30 tests covering every rule. No engine wiring; old v1 types kept alive. Build green; runtime untouched.
- **PR #47** — Greenfield `compileFlow` (386 lines, no v1 shims) + all 9 catalog YAMLs migrated to `schema_version: "2.0"` + deletion of `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `validate.ts`, `compile.ts`, the entire `compilers/` directory. 29 consumer files migrated (MCP servers, route handlers, UI components, verify scripts). The `Team`, `Workflow`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow` union all deleted from `types.ts`. New helper `apps/vada-ai/web/src/lib/flow-helpers.ts` (39 lines) centralises shape detection for UI consumers (`DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, `calculator.ts`). 67 engine tests, 33 UI tests, 21/21 typecheck pass, biome clean.
- **PR #48** — Cleanup follow-up. `buildRevisionCondition` throws on unsupported signal types (was silently coercing `equals` and `matches` to `contains`). `RevisionCondition` collapsed from 3-variant union to single-variant interface. Dead `json-field-equals` / `json-field-truthy` case blocks + orphaned `getJsonField` helper removed from adapter and graph-builder. 1 new test, 68 engine tests total.

### Pragmatic weakenings from the original design (honest capture)

1. **Shape detection vs generic walker.** The original design called for "one engine compiler" with "zero branches on workflow type." `compileFlow` instead contains 4 shape-detection branches over `flow.rounds` topology (`solo`, `brokered-no-synth`, `brokered-synth`, `rounds-audit`) that emit matching v1 Plan node ids. The reason: the adapter, `resolveAuditChain`, the route handler, and the UI all depend on the v1 node-id conventions (`reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`). Rewriting all four consumers in lockstep was out of scope; PR #47 shipped the schema unification and absorbed the compromise in the compiler. Captured as OQ-I in `vada-state.md`: a future PR could rewrite `compileFlow` as a generic round-id-namespaced walker once the adapter and route handler are refactored.

2. **TemplateState shape unchanged.** The original design specified a new template context with `rounds.<id>.outputs`, `currentRound.prior_agents`, `currentRound.repeat_index`, and `revision.source_round_id` / `revision.source_outputs` / `revision.index` variables. v2 YAMLs in the catalog **still use the v1 TemplateState shape** (`outputsByRound`, `lastOutputByAgent`, `conclusion`, `auditOutputs`, `isRevision`, `revisionIndex`, `participants`, `customVars.X`, `allPreviousOutputs`). The adapter was not refactored as part of that migration. Captured as OQ-H in `vada-state.md`: the new template context is a future PR paired with the OQ-I compiler refactor.

3. **PR 3 (MCP `agent_config` rename + new SSE events) deferred.** The original design called for renaming the MCP `reviewer_config` parameter to `agent_config` and emitting new generic SSE events (`round_started`, `round_completed`, `revision_started`) in place of the special-cased `state_changed: ROUND_N | CONCLUDING | AUDITING | REVISING` and `synthesis_complete`. PR #47 left the MCP parameter and SSE event names unchanged. The MCP contract continues to accept `reviewer_config`; the deliberation route continues to emit the v1 SSE event vocabulary. Both work correctly with v2 YAMLs — the mapping is internal. PR 3 is a separate effort that can land independently.

4. **PR 4 (UI rewrite) deferred.** The original design called for replacing `RoundStrip` / `Round` / `RoundView` / `useRoundStrip` with `FlowFeed` / `RoundColumn` / `AgentGrid` / `AgentChain` / `AgentCard` / `useFlowState`. PR #47 left the existing UI components in place; the only UI work was migrating consumers of the old engine API to call `flow-helpers.detectShape` instead of inspecting workflow union members. The empty-state "Agents are getting ready…" bug (Bug #1 from the May 11 audit) is still present. PR 4 is a separate effort.

5. **Synthesizer template fix landed unintentionally inside PR #47.** The v1 `vada-reviewers-synthesis.yaml` referenced `{{reviewerResponses}}` in its synthesis template — a variable the engine never populated. The synthesizer ran blind in production. PR #47 fixed this in the v2 migration: the synthesis template now uses `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}`. This was not in the original design scope but was caught during the migration and fixed atomically.

### Decisions on the original Open Questions

OQ-1 (`agent_failure` defaulting): Resolved as designed — `continue` for parallel, `abort` for serial; explicit override always wins. Implemented in `resolveAgentFailure` and Rule 10.

OQ-2 (round names vs ids in SSE): **Not resolved in PR #47.** SSE events still send the v1 integer `round` field. New `round_id` / `repeat_index` fields are PR 3 work.

OQ-3 (UI labelling of round repeats): N/A — UI rewrite (PR 4) deferred.

OQ-4 (`agent_config` flat shape): N/A — MCP rename (PR 3) deferred. `reviewer_config` is the parameter name shipped today.

OQ-5 (`output_format: structured` events): N/A — `synthesis_complete` SSE event still exists. PR 3 work.

OQ-6 (round display_name + description): Resolved as designed — round has required `name` (rendered in UI), optional `description` not yet implemented (no consumer needs it).

OQ-7 (audit signal robustness): Resolved with a nuance in the cleanup follow-up. Schema accepts `contains | equals | matches` for forward extensibility; compiler ships `contains` only and throws on the others.

OQ-8 (empty rounds): Rejected at validation. Rule 9.

OQ-9 (inline vs referenced agents): Reference by name. Rule 4 enforces.

OQ-10 (session migration): No migration. `spec_id` stable across schema versions; no v1 sessions corrupted.

---

## Purpose (original)

Today's YAML schema describes three structurally distinct flow shapes:

- **Brokered-no-synthesis** (`vada-reviewers`): `reviewers:` top-level array, no `flow:` block
- **Brokered-with-synthesis** (`vada-reviewers-synthesis`): `reviewers:` top-level array, `flow.synthesis:` block
- **Rounds-based** (`sparring`, `crucible`, `war-room`): `flow.rounds:`, `flow.synthesis:`, `flow.audit:` blocks; no top-level `reviewers:`

The engine has separate compilers for each. The MCP server has special-casing. The web UI is hardcoded to the rounds-era shape and doesn't render single-round brokered teams correctly (Bug #1 from the May 11 audit — "Agents are getting ready…" stays visible for the entire run even though three reviewers complete).

This refactor collapses everything into one universal shape: **a flow is a sequence of rounds**. Each round has agents, layout, name, and failure semantics. Synthesis is just a round with one agent. Audit is just a round. Revision is declarative — any round can declare it triggers a re-run of an earlier round on a defined signal.

The win:
- One YAML schema. Authoring a new team is one structure.
- One engine compiler. New flow patterns are YAML changes, not code changes.
- One MCP server input shape. Same for hosted and local. **(Deferred to PR 3.)**
- One UI renderer. Adding a flow shape is zero UI work. **(Deferred to PR 4.)**
- Cleaner mental model for everyone (you, Claude, executors, future contributors).

This is Path β from the prior design doc (the abandoned UI-only Path α). The refactor touches the entire stack precisely because piecemeal cleanup leaves the schema as a permanent bug-magnet.

## The conceptual model

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

## Data flow — how rounds connect to each other

> **Note (May 13, 2026):** The template context shape described below was the design target. The shipped implementation (PR #47) preserves the v1 `TemplateState` (`outputsByRound`, `lastOutputByAgent`, `conclusion`, etc.) rather than introducing the round-namespaced context. The mapping table at the end of this section documents what each new variable corresponds to today. The new context shape is OQ-H in `vada-state.md`, paired with the compiler refactor (OQ-I) as future work.

The engine threads state from one round to the next via a **uniform Handlebars template context**. Each round's `message_template` is rendered against this context before being sent to the round's agents.

### What's in the template context (design target — not shipped)

At any round, the template has access to:

| Variable | Type | Description | Shipped today (v1 TemplateState) |
|---|---|---|---|
| `question` | string | The original user input (the brief) | `{{question}}` |
| `rounds.<round_id>.outputs` | array | All agent outputs from a completed prior round | `outputsByRound.[N]` indexed by round position |
| `rounds.<round_id>.repeats[N].outputs` | array | For multi-repeat rounds, the outputs from each individual repeat | Same — `outputsByRound` covers multi-repeat by position |
| `currentRound.prior_agents` | array | For serial-layout rounds: agents in the current round that have already run | `currentRoundOutputs` |
| `currentRound.repeat_index` | number | For multi-repeat rounds: which repeat we're currently in (0-based) | `roundIndex` |
| `revision.source_round_id` | string \| undefined | When the round is being re-run via `on_failure: revise`, the id of the round whose signal triggered the revision | Not directly available — `isRevision` is the boolean signal |
| `revision.source_outputs` | array \| undefined | The outputs of the source round that triggered the revision (e.g., the audit's FLAG output) | `auditOutputs` |
| `revision.index` | number \| undefined | The revision attempt counter (0 = original run, 1 = first revision, etc.) | `revisionIndex` |

Custom variables defined at the flow level (e.g., `customVars.domain` for the Domain Expert) remain accessible as `customVars.<name>`. **This is shipped today.**

### Why implicit-template-context (Option A) and not explicit `inputs:` (Option B)

The schema could require each round to declare `inputs: { reviewer_responses: rounds.review.outputs }` and the template would only see what's declared. This would make data flow validatable and explicit. It's the architecturally cleaner choice.

For v1 of this refactor we go with Option A (implicit) for three reasons:

1. **Today's engine already works this way.** Migration doesn't require touching template content beyond the round-shape changes.
2. **YAML schema weight.** Adding `inputs:` doubles the round-spec surface area for a benefit that's only visible at validation time, not at runtime.
3. **Easy to upgrade later.** Adding `inputs:` as an optional field in a future PR is non-breaking — when present, validate it; when absent, fall back to implicit.

This is captured as future work in the post-refactor backlog. **As of May 13, 2026, no `inputs:` field has been added — Option A is the shipped behaviour.**

## Within-round input model — message_template at round vs agent level

A round can have N agents. The question: where does the message_template live?

**Decision (shipped):** `message_template` lives on the round (default for all agents) with optional per-agent override. Validation Rule 8: a round must have either a round-level `message_template` OR every agent in the round must have its own.

### Default case — same prompt to all agents in the round

For vendor-diverse reviewers (Vāda Reviewers), all three agents get the same prompt. The prompt is the same; only the model varies. The round declares one template:

```yaml
- id: review
  name: Reviewers
  agents:
    - name: Gemini
    - name: GPT
    - name: Grok
  layout: parallel
  message_template: "{{question}}"   # same template applied to all 3 agents
```

### Override case — one agent needs a different prompt

```yaml
- id: review
  name: Reviewers
  agents:
    - name: Gemini
      message_template: "{{question}} (please be concise — under 200 words)"
    - name: GPT
    - name: Grok
  layout: parallel
  message_template: "{{question}}"
```

### Why this shape

1. **Removes duplication.** Today's `vada-reviewers.yaml` declared `message_template: "{{question}}"` three times. New schema: declare once.
2. **Matches design intent.** Vendor diversity = "same prompt, different models." The schema's natural default reflects this.
3. **Preserves flexibility.** Per-agent overrides for the rare case.
4. **Conceptually correct.** A round has ONE input (its message_template, rendered against accumulated state). The engine fans that input out to N agents.
5. **Generalizes to serial rounds.** Strategist and Critic in sparring share one round-level template; their template handles both first-agent and subsequent-agent cases via Handlebars conditionals.

### Agent definitions still live at the flow level

The top-level `agents` array holds full agent definitions (system_prompt, model, tools, classifier, output_format, etc.). Rounds reference agents by name and may only override the `message_template`. The system_prompt, model, etc. are flow-level properties — they describe who the agent IS, not how it's used in a given round.

## Mapping each current YAML to the new schema

All 9 catalog YAMLs were migrated in PR #47. The shape mapping table is now in `yaml-schema-reference.md` and `vada-state.md` (Phase 14). The pre-migration design examples below are preserved for the historical record.

### `vada-reviewers` — 1 round (shipped)
### `vada-reviewers-synthesis` — 2 rounds (shipped)
### `sparring` — 3 rounds (spar, synthesis, audit) (shipped)
### `crucible` — same as sparring with 4 spar agents (shipped)
### `war-room` — same as sparring with 6 spar agents (shipped)
### `a0-baseline`, `a1-baseline` — 1 round with 1 agent (shipped)
### `brokered-trio`, `brokered-quartet` — 1 round with N agents (shipped)

For the full YAML examples by shape, see `apps/vada-ai/specs/yaml-schema-reference.md` Worked Examples section.

## Cross-stack changes (status)

### Schema + types — SHIPPED

- New TypeScript types in `packages/engine/src/flow-types.ts`: `Flow`, `Round`, `AgentInRound`, `OnFailureSpec`. Shipped.
- Deleted: `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, the `Workflow` union, `Team`. All deleted in PR #47.
- New: `validateFlow(flow)` replaces the per-workflow validators. Shipped in PR #41.
- 10 validation rules — all shipped and tested.

### Engine compiler — SHIPPED (with shape-detection pragmatic weakening)

- One function: `compileFlow(flow, question, model?, customVars?) → Plan`. Shipped.
- Replaces: `compileBrokered`, `compileRounds`, `compileSolo`, `compileCustom`. All deleted in PR #47.
- Plan structure unchanged. The compiler walks rounds and emits nodes matching v1 ids.
- For `on_failure: { action: 'revise', target, max_revisions }`, the compiler emits a conditional edge from the audit terminal back to the next synthesis terminal slot (or `__END__` on max). Shipped.
- Cleanup (PR #48): compiler throws on `signal.type: 'equals' | 'matches'` instead of silently coercing.

### MCP server — DEFERRED (PR 3)

- `vada__consult` `reviewer_config` parameter unchanged. Still works correctly with v2 YAMLs.
- `vada__deliberate` input shape unchanged.
- The `agent_config` rename is PR 3 work.

### Web route handler — PARTIALLY SHIPPED

- Reads new schema via `loadFromCatalog` (delegates to `loadFlow`). Shipped.
- Same `agentVendorOverrides` construction as today (the vendor registry stays). Shipped.
- Calls `compileFlow` instead of the old per-workflow compilers. Shipped.
- SSE event names unchanged (still v1 vocabulary). PR 3 work.

### SSE streaming contract — DEFERRED (PR 3)

The current event types are still emitted as v1:
- `keepalive`
- `agent_completed` — `{ id, agent, round, content }` — integer `round`
- `state_changed` — `{ state: "ROUND_N" | "TERMINAL" | "CONCLUDING" | "AUDITING" | "REVISING" | ... }`
- `synthesis_complete` — `{ agent, content, structured, is_revision }`
- `terminal` — `{ terminalState }`

The new event design (`round_started` / `round_completed` / `revision_started`, drop `state_changed`, drop `synthesis_complete`) is PR 3 work.

### UI renderer — DEFERRED (PR 4)

The existing `RoundStrip` / `Round` / `RoundView` / `useRoundStrip` components are still in place. The new `FlowFeed` / `RoundColumn` / `AgentGrid` / `AgentChain` / `AgentCard` / `useFlowState` rewrite is PR 4 work.

What did land in PR #47 for the UI: `flow-helpers.ts` (39 lines, shared shape detection consumed by `DeliberatePanel`, `TeamPicker`, `TeamSummary`, `TeamHeader`, `AgentTab`, `calculator.ts`) — so every UI consumer reads the same shape information instead of inspecting the deleted workflow union types.

### Decision log entry — SHIPPED

The universal round-based YAML schema and its cleanup follow-up are both Vāda-internal decisions, even though the schema touches multiple consumer files in the Vāda codebase. The global record only gets entries for cross-product ecosystem-level decisions (the v2 naming framing is the example that qualifies; the engine refactor is Vāda's own concern).

## Rollout — 4 PRs sequenced on a feature branch

Working branches: `feat/generic-flow-refactor-pr1` (PR #41), `feat/generic-flow-refactor-pr2` (PR #47), `chore/d033-signal-and-revision-cleanup` (PR #48).

### PR 1 — Schema + types + validation — SHIPPED (May 12)

Landed as designed. New types, new `validateFlow`, 30 unit tests. Build stayed green. The old engine surface continued to work. Stub for `compileFlow` was not required — PR 2 followed immediately.

### PR 2 — `compileFlow` + YAML migration — SHIPPED (May 13)

Landed with broader scope than originally planned: also included full deletion of v1 engine surface, atomic migration of 29 consumer files, `flow-helpers.ts` extraction, and the `{{reviewerResponses}}` → `{{#each allPreviousOutputs}}` bug fix. Principal rejected the proposed `compileSpec = compileFlow`-with-aliasing backwards-compat shim in favour of full migration. Result: 60 files touched, +477/-2637 lines. Build green; all tests pass.

### PR 3 — MCP server + route handler + new SSE events — DEFERRED

Not yet started. The original brief is captured here for the eventual implementer:
- `vada__consult` and `vada__deliberate` updated for new agent_config shape
- Route handler emits new SSE event names (`round_started`, `round_completed`, `revision_started`) and drops the old ones
- Temporarily emit BOTH old and new events to let PR 4 land independently

### PR 4 — UI rewrite — DEFERRED

Not yet started. Captures the dependency on PR 3 emitting the new events.

### Cleanup PR — SHIPPED (May 13)

Not in the original plan; emerged during PR #47 review.
- `buildRevisionCondition` throws explicitly on unsupported signal types
- `RevisionCondition` collapsed to single-variant interface
- Dead `json-field-equals` / `json-field-truthy` case blocks removed from adapter
- `getJsonField` helper deleted (no callers)

### Docs cleanup PR — IN FLIGHT

This PR. Aligning all spec docs and skill files with the v2 schema and the shipped surface. Scope deliberately narrower than originally planned: 5 files (`yaml-schema-reference.md`, `vada-state.md`, `vada-architecture` SKILL, `vada-yaml-authoring` SKILL, `atta-engine` SKILL) plus this design doc amendment plus PM updates (`now.md`, `changelog.md`). Other Vāda spec files (vada-product-spec, vada-product-recognitions, vada-reviewers-spec, vada-teams-catalog/*) listed as "patch when touched for other work" in `roadmap.md` — out of scope.

## Open questions for Principal review (RESOLVED — see Implementation Status above)

All 10 OQs were addressed in implementation or explicitly deferred. See "Decisions on the original Open Questions" at the top of this document.

## What I need from you, Dani (HISTORICAL — RESOLVED)

All 7 items resolved at the design review on May 12 prior to PR #41 dispatch. Captured for the historical record:

1. ✅ Conceptual model confirmed
2. ✅ Data flow model confirmed (Option A implicit; `inputs:` deferred)
3. ✅ Within-round input model confirmed (round-level default, per-agent override)
4. ✅ OQ-1 through OQ-10 resolved
5. ✅ Rollout sequencing confirmed (4 PRs)
6. ✅ Docs trail confirmed (design doc + briefs sequenced)
7. ✅ Nothing additional flagged
