# Generic Flow Refactor — Design

**Status:** Draft, not ratified
**Author:** Claude (Critic/Synthesizer) with Dani (Principal)
**Date:** May 12, 2026
**Branch:** `design/generic-flow-refactor`
**Scope:** Stack-wide. New YAML schema → engine compilers → MCP server → web route handler → UI renderer. All 9 catalog YAMLs migrated.

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

## The conceptual model

```
Flow {
  id, display_name, description, experimental, benchmarked, defaults, agents
  rounds: Round[]                    // 1 or more rounds, in order
}

Round {
  id              string             // unique within the flow
  name            string             // display name shown in UI ("Reviewers", "Sparring", "Synthesis", "Audit")
  agents          AgentRef[]         // 1 or more agents (ordered if layout=serial; set if layout=parallel)
  layout          'parallel' | 'serial'
  repeats         number             // defaults to 1 — how many times this round runs back-to-back
  message_template?  string          // template for the round (used by all agents in the round)
  agent_failure   'abort' | 'continue'    // if one agent fails, do we abort the round or continue?
  on_failure?     OnFailureSpec      // what to do if this round emits a "failure signal" (see below)
}

OnFailureSpec {
  action          'abort' | 'continue' | 'revise'
  target?         string             // round id to re-run (required if action='revise')
  max_revisions?  number             // how many times we'll retry (required if action='revise', defaults to 1)
  signal          { type: 'contains' | 'equals' | 'matches', value: string, case_sensitive?: boolean }
}

AgentRef = same as today's Agent definition (name, model, system_prompt, tools, classifier, output_format, output_schema)
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

## Mapping each current YAML to the new schema

### `vada-reviewers` — 1 round
```yaml
id: vada-reviewers
display_name: Reviewers
description: "Three different LLMs review your problem in parallel..."
defaults:
  model: claude-sonnet-4-6
agents:
  - name: Gemini
    model: gemini-2.5-pro
    system_prompt: |
      You are an external critical reviewer...
  - name: GPT
    model: gpt-4o
    system_prompt: |
      You are an external critical reviewer...
  - name: Grok
    model: grok-3
    system_prompt: |
      You are an external critical reviewer...
rounds:
  - id: review
    name: Reviewers
    agents: [Gemini, GPT, Grok]
    layout: parallel
    message_template: "{{question}}"
    agent_failure: continue          # vendor diversity — partial is fine
```

### `vada-reviewers-synthesis` — 2 rounds
```yaml
id: vada-reviewers-synthesis
display_name: "Reviewers + Synthesis"
agents:
  - name: Gemini, GPT, Grok  (as above)
  - name: Synthesizer
    role: synthesizer
    model: claude-sonnet-4-6
    system_prompt: |
      You are a synthesizer for the Vāda Reviewers team...
rounds:
  - id: review
    name: Reviewers
    agents: [Gemini, GPT, Grok]
    layout: parallel
    message_template: "{{question}}"
    agent_failure: continue
  - id: synthesis
    name: Synthesis
    agents: [Synthesizer]
    layout: parallel              # single agent — layout is moot, parallel is the natural default
    message_template: |
      The original question is: "{{question}}"
      Reviewer responses: {{#each reviewerResponses}}[{{this.vendor}}] {{this.response}}{{/each}}
      Please synthesize...
    agent_failure: abort          # synthesis failure = no conclusion
```

### `sparring` — 3 rounds
```yaml
id: sparring
display_name: Sparring
agents:
  - name: Strategist, Critic, ConclusionSynthesizer, BlindCritic, FactChecker  (as today)
rounds:
  - id: spar
    name: Sparring
    agents: [Strategist, Critic]
    layout: serial
    repeats: 3
    message_template: |
      {{#if roundIndex}}The following is the deliberation transcript so far: ...{{else}}{{question}}{{/if}}
    agent_failure: abort           # a missing Strategist breaks the Critic's input

  - id: synthesis
    name: Synthesis
    agents: [ConclusionSynthesizer]
    layout: parallel
    message_template: |
      The original question is: "{{question}}"
      Deliberation transcript: {{#each outputsByRound}}...{{/each}}
      ... CRITICAL INSTRUCTION ...
    agent_failure: abort

  - id: audit
    name: Audit
    agents: [BlindCritic, FactChecker]
    layout: parallel
    message_template: |
      Principal's question: {{question}}
      Conclusion to Review: {{conclusion}}
    agent_failure: continue
    on_failure:
      action: revise
      target: synthesis
      max_revisions: 1
      signal:
        type: contains
        value: FLAG
        case_sensitive: false
```

### `crucible` — same as sparring with 4 spar agents
### `war-room` — same as sparring with 6 spar agents

### `a0-baseline`, `a1-baseline` — 1 round with 1 agent
```yaml
id: a0-baseline
display_name: A0
agents:
  - name: A0
    model: claude-sonnet-4-6
rounds:
  - id: answer
    name: Answer
    agents: [A0]
    layout: parallel
    message_template: "{{question}}"
    agent_failure: abort
```

### `brokered-trio`, `brokered-quartet` — 1 round with N agents
Same shape as `vada-reviewers`, different agent count.

**Every YAML in the catalog fits one structure.** Adding a new flow is "describe its rounds in YAML." Zero engine code, zero UI code.

## Cross-stack changes

### Schema + types (`@atta/engine`, `@vada/cms` for Sanity if it mirrors)
- New TypeScript types in `packages/engine/src/types.ts`: `Flow`, `Round`, `AgentRef`, `OnFailureSpec`
- Delete: `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, the workflow discriminated union
- New: `validateFlow(spec)` replaces the per-workflow validators
- Validation rules:
  - `rounds.length >= 1`
  - All round `id`s unique within a flow
  - All `on_failure.target` references point to a prior round (no forward references, no cycles beyond `max_revisions`)
  - All `agents` referenced in any round exist in the top-level `agents` array
  - For `layout: serial`, agents are ordered; for `parallel`, ordering is ignored
  - `repeats >= 1`
  - `max_revisions >= 1` when `action='revise'`

### Engine compiler (`@atta/engine/src/compile.ts`)
- One function: `compileFlow(flow, question, model) → Plan`
- Replaces: `compileBrokered`, `compileRounds`, `compileSolo`, `compileCustom` (already deleted per D-014)
- Plan structure stays as-is (PlanNode + PlanEdge, per PR #31). The compiler just walks the rounds and emits nodes accordingly.
- For `on_failure: { action: 'revise', target, max_revisions }`, the compiler emits a conditional edge from the failing round's terminal back to the target round, with a revision counter on the state.
- Terminal state determination unchanged: CLEAN / ERROR / UNCONVERGED based on which agents produced output.

### MCP server (`apps/vada-ai/mcp-server`)
- `vada__consult` tool input shape:
  - Today's `reviewers[]` field becomes a generic `agent_overrides[]` (since reviewers aren't a special concept anymore — just agents in a round)
  - OR: keep `reviewers[]` as a UX-friendly alias that maps to "agents in the first round of the flow"
  - Lean: keep `reviewers[]` semantically as "the override list," but document that it means "the agents in the first round." For flows where the first round is the only round (vada-reviewers, brokered-trio), this is intuitive. For flows where the first round is part of a longer flow (sparring's first round of "spar"), per-agent overrides still target those agents — the name `reviewers` becomes slightly misleading but the mechanism is right.
- `vada__deliberate` tool input shape unchanged (just `team` enum + brief)
- `reviewer_config: Record<agentName, modelId>` (from PR #31) becomes `agent_config: Record<agentName, modelId>`, applied across all rounds where that agent appears. Name change is cosmetic — same validation, same registry-backed lookup.
- The hosted MCP route at `apps/vada-ai/web/src/app/api/mcp/route.ts` passes through to the same tools.

### Web route handler (`apps/vada-ai/web/src/app/api/deliberation/[id]/workflow/run/route.ts`)
- Reads the new schema via `loadYamlFromCatalog`
- Same `agentVendorOverrides` construction as today (PR #31 vendor registry stays)
- Calls `compileFlow` instead of the old per-workflow compilers
- SSE event names: see "Streaming contract" below

### SSE streaming contract
The current event types are:
- `keepalive`
- `agent_completed` — `{ id, agent, round, content }` — note: `round` is a number today
- `state_changed` — `{ state: "ROUND_N" | "TERMINAL" | "CONCLUDING" | "AUDITING" | "REVISING" | ... }`
- `synthesis_complete` — `{ agent, content, structured, is_revision }`
- `terminal` — `{ terminalState }`

In the new architecture, the special-cased states (`ROUND_N`, `CONCLUDING`, `AUDITING`, `REVISING`) get replaced by generic round-level events:

- `keepalive` — unchanged
- `agent_completed` — `{ id, agent, round_id, repeat_index, content, error? }` — `round_id` replaces the integer `round`; `repeat_index` is which iteration within a multi-repeat round (0 for non-repeating rounds)
- `round_started` — `{ round_id, name, repeat_index }` — emitted when the engine begins a round (or a new repeat of one)
- `round_completed` — `{ round_id, repeat_index, signal_matched?: 'revise' | 'abort' | null }` — emitted when a round's agents have all settled; includes the signal-matched action if `on_failure` triggered
- `revision_started` — `{ source_round_id, target_round_id, revision_index }` — emitted when an `on_failure: revise` triggers a re-run
- `terminal` — `{ terminalState }` — unchanged

The UI binds these events to the rounds it knows about from the spec. `state_changed` goes away entirely. `synthesis_complete` goes away — synthesis is just an `agent_completed` event for an agent in a single-agent round.

### UI renderer (`apps/vada-ai/web/src/app/(main)/deliberation/[id]/`)
- Delete: `RoundStrip.tsx`, `Round.tsx`, `RoundView.tsx`, `useRoundStrip.ts`, the empty-state "Agents are getting ready…" logic
- New: `FlowFeed.tsx`, `RoundColumn.tsx`, `AgentGrid.tsx`, `AgentChain.tsx`, `AgentCard.tsx`, `useFlowState.ts`
- `FlowFeed` reads the `rounds` array from the spec (loaded server-side in `page.tsx`) and renders one `RoundColumn` per round, top-to-bottom, centered.
- `RoundColumn`:
  - Header: round `name` + status badge
  - Body: agents rendered in `AgentGrid` (parallel) or `AgentChain` (serial) layout
  - For `repeats > 1`: multiple `AgentGrid`/`AgentChain` rows separated by a "Round N of M" divider
  - For `on_failure: revise` triggered: the round below shows both the original run and the revised run stacked, with the original marked "superseded by revision"
- `AgentCard`:
  - Avatar (the existing `<AIASphere>` cluster per agent)
  - Streaming content as it arrives
  - Error banner if `output.error` is set (showing the actual error message — leverages PR #35)
- Each card streams independently as its `agent_completed` event arrives. Cards exist on mount in `pending` state; they fill in as events arrive. No more "Agents are getting ready…" empty state.
- Horizontal scroll within `AgentGrid`/`AgentChain` when the agent count exceeds the viewport (your OQ-1 request)

### Decision log entry
A new `D-033` in `vada-decisions.md` captures this refactor. References D-011 ("engine has zero branches on workflow type" — this finally delivers that promise across the full stack), D-013 (`@vada/teams` deletion — same direction, but the YAML schema was still two-shape), D-018 → D-025 (YAML immutability — preserved, no `-v1` suffix needed since every YAML keeps its own id), D-029 (hosted MCP, unchanged), D-030 (ecosystem-shared keys, unchanged), D-032 (vendor registry, unchanged — sdkShape dispatch is orthogonal to the flow shape).

## Rollout — 4 PRs sequenced on a feature branch

Working branch: `feat/generic-flow-refactor` (separate from `design/generic-flow-refactor` where this doc lives).

### PR 1 — Schema + types + validation (Haiku-level, ~1 day)
- New types in `packages/engine/src/types.ts`
- New `validateFlow` function
- New JSON schema for IDE autocomplete (optional)
- Delete old workflow types (`BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`)
- Unit tests on `validateFlow` covering happy paths + every validation rule + revision-target reference rules
- Doesn't touch compilers, YAML files, or UI. Just types and validation.
- The compiler still builds against the new types — `compileFlow` is a stub that throws. Existing compilers are deleted in PR 2.
- This PR will break the build until PR 2 lands. Land them back-to-back, or land PR 1 with stubs that match the old surface during transition.

Lean: ship PR 1 with a `// TODO: refactor in PR 2` comment in the engine that satisfies the old compiler signatures temporarily by delegating to `compileFlow` stubs. The build stays green; the runtime fails for any flow execution until PR 2.

### PR 2 — `compileFlow` + YAML migration (Sonnet, ~2 days)
- One implementation of `compileFlow` that walks rounds and emits PlanNodes
- All 9 catalog YAMLs migrated to the new schema (hand-converted, validated by `validateFlow`)
- Old compilers deleted
- Existing engine tests updated to use the new YAMLs (the test harness reads catalog YAMLs to construct test cases)
- The route handler unchanged at this point — it calls `compileFlow` instead of the old per-shape compilers, but the SSE events still use old event names

Verification: every existing benchmark run in `/bench` reproduces (since the same YAMLs, just in new schema, should produce equivalent Plans, which produce equivalent execution).

### PR 3 — MCP server + route handler + new SSE events (Sonnet, ~1 day)
- `vada__consult` and `vada__deliberate` updated for new agent_config shape
- Route handler emits new SSE event names (`round_started`, `round_completed`, `revision_started`) and drops the old ones (`state_changed: ROUND_N` etc.)
- The UI still consumes old events at this point — temporarily, the route emits BOTH old and new events as a transition. This lets PR 4 land independently of PR 3.

### PR 4 — UI rewrite (Sonnet, ~2-3 days)
- New components: `FlowFeed`, `RoundColumn`, `AgentGrid`, `AgentChain`, `AgentCard`, `useFlowState`
- Delete: `RoundStrip`, `Round`, `RoundView`, `useRoundStrip`, dead empty-state logic
- New event-handling: subscribe to `round_started`, `round_completed`, `revision_started`, `agent_completed`
- Drop subscriptions to deprecated events
- After this PR, PR 3's dual-event emission can be cleaned up in a small follow-up

Total: 4 PRs, 5-7 days end-to-end if dispatched serially. Faster if PR 2 + PR 3 + PR 4 are dispatched in parallel after PR 1 ratifies the types.

### Cleanup PR — Drop deprecated event emission (~½ day, mechanical)
- Route handler stops emitting old events
- Verify no callers depend on them

## Open questions for Principal review

**OQ-1 — `agent_failure` defaulting.** Should each round have to declare `agent_failure` explicitly, or is there a sensible default?
- Lean: default to `continue` for parallel rounds (vendor diversity assumption), `abort` for serial rounds (the chain breaks without a link). Override per round as needed.

**OQ-2 — Round names vs round ids.** Today, `round` in SSE events is an integer (`round: 1`, `round: 2`). In the new architecture, do we send `round_id` (string, matches the YAML) or keep an integer index, or both?
- Lean: `round_id` (string) is the canonical identifier sent in SSE events. Plus `repeat_index` (integer, 0-based) for multi-repeat rounds. Drop integer round numbers from the API surface entirely — they were brittle indexing into hardcoded structures.

**OQ-3 — How does the UI label round repeats?**
- For `repeats: 3` rounds (sparring/crucible/war-room): labels "Round 1," "Round 2," "Round 3" within the round column? Or "Repeat 1/3," "Repeat 2/3," "Repeat 3/3"? Or just no labels (let the user infer from the divider)?
- Lean: "Round 1 of 3" style. Clear, no jargon, matches how users described it pre-refactor.

**OQ-4 — Does `agent_config` still target by agent name only, or does it need round-id awareness?**
- Today's `reviewer_config` is `Record<agentName, modelId>` — implicitly scoped to the first round because that's where reviewers live.
- New schema: an agent named `Strategist` appears in `sparring`'s `spar` round AND potentially future rounds. Does `agent_config["Strategist"] = "claude-opus-4-7"` apply to ALL Strategist uses across all rounds, or do we need `agent_config[round_id][agent_name]`?
- Lean: keep flat `Record<agentName, modelId>` — applies to that agent wherever it appears. Per-round-per-agent overrides are a future feature if anyone asks. Same agent doing the same job in multiple rounds should use the same model in most cases.

**OQ-5 — What happens to `output_format: structured` agents (today's `ConclusionSynthesizer`, the future `Synthesizer` in `vada-reviewers-synthesis`)?**
- Today these emit a `synthesis_complete` event with a `structured` field
- New architecture: they emit `agent_completed` like everyone else; the `structured` field is part of `agent_completed`'s payload when present
- Lean: yes — `agent_completed` payload becomes `{ id, agent, round_id, repeat_index, content, structured?: object, error? }`. The UI checks for the `structured` field and renders it via the existing `ConclusionPanel` logic if present.

**OQ-6 — Should `display_name` and `description` apply to the flow, the round, or both?**
- Today: flow has both.
- New: flow has both, AND each round has a `name`. Does a round also need a `description`?
- Lean: round has `name` (required, shown in UI), `description?` (optional, shown in tooltip on hover if present). Same as flow.

**OQ-7 — Audit "FLAG" signal robustness.**
- Today's audit uses `contains: "FLAG"` (case-insensitive). The `on_failure.signal` in the new schema generalizes this. But the SIGNAL itself is fragile — an agent that emits "I would not FLAG this conclusion as flawed" matches the contains-FLAG check. Today this is a known limitation per `vada-state.md`.
- Lean: keep `contains` semantics for v1. Add `signal.type: 'matches'` (regex) and `signal.type: 'structured_field'` (look at JSON field of the agent output) as future work — they're trivial to add to the union but require iteration on use cases first.

**OQ-8 — Empty rounds (rounds with no agents).**
- Should the schema reject these at validation time, or allow them as "deliberate no-op rounds" for some future use case?
- Lean: reject. A round must have at least one agent. Empty rounds are a bug or a malformed flow.

**OQ-9 — Inline vs referenced agent definitions in rounds.**
- Today: `agents:` is top-level; `flow.rounds.agents:` references by name.
- New: same — `rounds[N].agents` is an array of names (string), referencing the top-level `agents:` definitions.
- Confirm? This avoids duplicating agent specs in multiple rounds.
- Lean: confirmed. Reference-by-name is the right model.

**OQ-10 — Migration of existing sessions.**
- Existing `sessions` table rows have `spec_id` referencing today's YAML structure. If a user resumes an old session after the refactor lands, the YAML they reference is now in the new schema.
- Lean: this is fine because spec_id is a stable identifier. The new YAML at the same id describes the same flow. Old transcripts have agent names that still exist in the new YAML's `agents:` block. UI renders them in the new layout from new SSE events. NO data migration needed.

## What I need from you, Dani

1. **Confirm the conceptual model.** Universal rounds, declarative revision, `on_failure` schema.
2. **Resolve OQ-1 through OQ-10.** Most have explicit leans; push back where wrong.
3. **Confirm the rollout sequencing.** 4 PRs as described, or different shape?
4. **Confirm the docs trail.** Design doc here, D-033 entry in `vada-decisions.md`, then exec briefs sequenced.
5. **Anything you want flagged but I missed.**

Once these are settled, I write the D-033 decision log entry (added to the same `design/generic-flow-refactor` branch as a second commit), and then the first brief (PR 1 — schema + types).
