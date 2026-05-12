# Generic Flow Refactor — Design

**Status:** Draft, not ratified
**Author:** Claude (Critic/Synthesizer) with Dani (Principal)
**Date:** May 12, 2026 (amended)
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

## Data flow — how rounds connect to each other (NEW SECTION)

The engine threads state from one round to the next via a **uniform Handlebars template context**. Each round's `message_template` is rendered against this context before being sent to the round's agents.

### What's in the template context

At any round, the template has access to:

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

### How a round references prior round outputs

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

### Multi-round template examples

**Sparring's `spar` round template** (multi-repeat, serial):

```yaml
- id: spar
  name: Sparring
  agents: [Strategist, Critic]
  layout: serial
  repeats: 3
  message_template: |
    {{#if currentRound.repeat_index}}
    Prior repeats:
    {{#each rounds.spar.repeats}}
    [Repeat {{@index}}]
    {{#each this.outputs}}{{this.agent}}: {{this.content}}{{/each}}
    {{/each}}
    
    Prior agents in this repeat:
    {{#each currentRound.prior_agents}}{{this.agent}}: {{this.content}}{{/each}}
    {{else}}
    {{question}}
    {{/if}}
```

This template reads cleanly: on the first repeat, just the question. On subsequent repeats, the prior repeats' transcripts plus any prior agents that ran in the current repeat. The same template fires for both Strategist and Critic; Strategist sees `currentRound.prior_agents = []` (first agent in the serial chain), Critic sees Strategist's just-produced output.

**Sparring's synthesis round** (single agent, references prior round explicitly):

```yaml
- id: synthesis
  name: Synthesis
  agents: [ConclusionSynthesizer]
  layout: parallel
  message_template: |
    {{#if revision.index}}
    The original question is: "{{question}}"
    Deliberation transcript:
    {{#each rounds.spar.repeats}}{{#each this.outputs}}{{this.agent}}: {{this.content}}{{/each}}{{/each}}
    
    Your previous conclusion was flagged:
    {{rounds.synthesis.outputs.0.content}}
    
    Auditor objection:
    {{revision.source_outputs.0.content}}
    
    CRITICAL: ...
    {{else}}
    The original question is: "{{question}}"
    Deliberation transcript:
    {{#each rounds.spar.repeats}}{{#each this.outputs}}{{this.agent}}: {{this.content}}{{/each}}{{/each}}
    GENERATE JSON NOW.
    {{/if}}
```

Note the `revision.index` branching — the engine populates `revision.*` variables only when this round is being re-run after an audit FLAG. The template handles both the original synthesis path and the revision path in one place.

## Within-round input model — message_template at round vs agent level (NEW SECTION)

A round can have N agents. The question: where does the message_template live?

**Decision:** `message_template` lives on the round (default for all agents) with optional per-agent override.

### Default case — same prompt to all agents in the round

For vendor-diverse reviewers (Vāda Reviewers), all three agents get the same prompt. The prompt is the same; only the model varies. The round declares one template:

```yaml
- id: review
  name: Reviewers
  agents:                          # simplified — name-only references
    - name: Gemini
    - name: GPT
    - name: Grok
  layout: parallel
  message_template: "{{question}}"   # same template applied to all 3 agents
```

The engine renders the template once per agent (since each agent has its own system_prompt and its own template context might vary slightly via `currentRound.*`), but the template source is shared.

### Override case — one agent needs a different prompt

For flows where a specific agent needs different framing (rare today, possible tomorrow), the agent-level template overrides the round default:

```yaml
- id: review
  name: Reviewers
  agents:
    - name: Gemini
      message_template: "{{question}} (please be concise — under 200 words)"
    - name: GPT
      # no override → uses round default
    - name: Grok
      # no override → uses round default
  layout: parallel
  message_template: "{{question}}"
```

### Round-level template is the default; agent-level template overrides it

The semantics:

- Round has `message_template` → that's the default for any agent in the round that doesn't have its own
- Agent (within the round) has `message_template` → overrides the round default for that specific agent
- If a round has `message_template` AND every agent has its own → the round-level one becomes a fallback for any future agent added to the round
- Validation: a round must have either a round-level `message_template` OR every agent in the round must have its own. The engine rejects rounds where neither is present.

### Why this shape

1. **Removes duplication.** Today's `vada-reviewers.yaml` declares `message_template: "{{question}}"` three times. New schema: declare once.
2. **Matches design intent.** Vendor diversity = "same prompt, different models." The schema's natural default reflects this.
3. **Preserves flexibility.** Per-agent overrides for the rare case.
4. **Conceptually correct.** A round has ONE input (its message_template, rendered against accumulated state). The engine fans that input out to N agents. The round HAS one input even though it CONTAINS N agents.
5. **Generalizes to serial rounds.** Strategist and Critic in sparring share one round-level template that branches via `{{#if currentRound.prior_agents}}` — Strategist sees no prior agents (it's first); Critic sees Strategist's output. Single template, branching on context.

### Agent definitions still live at the flow level

The top-level `agents` array holds full agent definitions (system_prompt, model, tools, classifier, output_format, etc.). Rounds reference agents by name and may only override the `message_template`. The system_prompt, model, etc. are flow-level properties — they describe who the agent IS, not how it's used in a given round.

This separation matches today's schema and keeps the migration mechanical.

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
    agents:
      - name: Gemini
      - name: GPT
      - name: Grok
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
    agents:
      - name: Gemini
      - name: GPT
      - name: Grok
    layout: parallel
    message_template: "{{question}}"
    agent_failure: continue
  - id: synthesis
    name: Synthesis
    agents:
      - name: Synthesizer
    layout: parallel              # single agent — layout is moot, parallel is the natural default
    message_template: |
      Question: {{question}}
      Reviewer responses:
      {{#each rounds.review.outputs}}[{{this.agent}}] {{this.content}}{{/each}}
      Please synthesize.
    agent_failure: abort          # synthesis failure = no conclusion
```

### `sparring` — 3 rounds (spar, synthesis, audit)
```yaml
id: sparring
display_name: Sparring
agents:
  - name: Strategist, Critic, ConclusionSynthesizer, BlindCritic, FactChecker  (as today)
rounds:
  - id: spar
    name: Sparring
    agents:
      - name: Strategist
      - name: Critic
    layout: serial
    repeats: 3
    message_template: |
      {{#if currentRound.repeat_index}}
      Prior repeats: {{#each rounds.spar.repeats}}...{{/each}}
      Prior agents in this repeat: {{#each currentRound.prior_agents}}...{{/each}}
      {{else}}
      {{question}}
      {{/if}}
    agent_failure: abort           # a missing Strategist breaks the Critic's input

  - id: synthesis
    name: Synthesis
    agents:
      - name: ConclusionSynthesizer
    layout: parallel
    message_template: |
      {{#if revision.index}}
      Revision instructions: {{revision.source_outputs.0.content}} ...
      {{else}}
      Original question: "{{question}}"
      Deliberation transcript: {{#each rounds.spar.repeats}}...{{/each}}
      GENERATE JSON NOW.
      {{/if}}
    agent_failure: abort

  - id: audit
    name: Audit
    agents:
      - name: BlindCritic
      - name: FactChecker
    layout: parallel
    message_template: |
      Principal's question: {{question}}
      Conclusion to Review: {{rounds.synthesis.outputs.0.content}}
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
    agents:
      - name: A0
    layout: parallel
    message_template: "{{question}}"
    agent_failure: abort
```

### `brokered-trio`, `brokered-quartet` — 1 round with N agents
Same shape as `vada-reviewers`, different agent count.

**Every YAML in the catalog fits one structure.** Adding a new flow is "describe its rounds in YAML." Zero engine code, zero UI code.

## Cross-stack changes

### Schema + types (`@atta/engine`, `@vada/cms` for Sanity if it mirrors)
- New TypeScript types in `packages/engine/src/types.ts`: `Flow`, `Round`, `AgentInRound`, `OnFailureSpec`
- Delete: `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, the workflow discriminated union
- New: `validateFlow(spec)` replaces the per-workflow validators
- Validation rules:
  - `rounds.length >= 1`
  - All round `id`s unique within a flow
  - All `on_failure.target` references point to a prior round (no forward references, no cycles beyond `max_revisions`)
  - All `agents[].name` referenced in any round exist in the top-level `agents` array
  - For `layout: serial`, agents are ordered; for `parallel`, ordering is ignored
  - `repeats >= 1`
  - `max_revisions >= 1` when `action='revise'`
  - Either round has `message_template` OR every agent in the round has its own `message_template`
  - A round with zero agents is rejected

### Engine compiler (`@atta/engine/src/compile.ts`)
- One function: `compileFlow(flow, question, model) → Plan`
- Replaces: `compileBrokered`, `compileRounds`, `compileSolo`, `compileCustom` (already deleted per D-014)
- Plan structure stays as-is (PlanNode + PlanEdge, per PR #31). The compiler just walks the rounds and emits nodes accordingly.
- For `on_failure: { action: 'revise', target, max_revisions }`, the compiler emits a conditional edge from the failing round's terminal back to the target round, with a revision counter on the state.
- Terminal state determination unchanged: CLEAN / ERROR / UNCONVERGED based on which agents produced output.

### MCP server (`apps/vada-ai/mcp-server`)
- `vada__consult` tool input shape:
  - Today's `reviewers[]` field stays as a UX-friendly alias mapping to "agents in the first round of the flow"
  - For flows where the first round is the only round (vada-reviewers, brokered-trio), this is intuitive
  - For flows where the first round is part of a longer flow (sparring), per-agent overrides still target those agents
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
- `agent_completed` — `{ id, agent, round_id, repeat_index, content, structured?, error? }` — `round_id` replaces the integer `round`; `repeat_index` is which iteration within a multi-repeat round (0 for non-repeating rounds); `structured` field present for agents with `output_format: structured`
- `round_started` — `{ round_id, name, repeat_index }` — emitted when the engine begins a round (or a new repeat of one)
- `round_completed` — `{ round_id, repeat_index, signal_matched?: 'revise' | 'abort' | null }` — emitted when a round's agents have all settled; includes the signal-matched action if `on_failure` triggered
- `revision_started` — `{ source_round_id, target_round_id, revision_index }` — emitted when an `on_failure: revise` triggers a re-run
- `terminal` — `{ terminalState }` — unchanged

The UI binds these events to the rounds it knows about from the spec. `state_changed` goes away entirely. `synthesis_complete` goes away — synthesis is just an `agent_completed` event for an agent in a single-agent round; the `structured` field on that event is what the UI checks for to render the structured conclusion panel.

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
- Unit tests on `validateFlow` covering happy paths + every validation rule + revision-target reference rules + template-required validation
- Doesn't touch compilers, YAML files, or UI. Just types and validation.
- The compiler still builds against the new types — `compileFlow` is a stub that throws. Existing compilers are deleted in PR 2.
- This PR will break the build until PR 2 lands. Land them back-to-back, or land PR 1 with stubs that match the old surface during transition.

Lean: ship PR 1 with a `// TODO: refactor in PR 2` comment in the engine that satisfies the old compiler signatures temporarily by delegating to `compileFlow` stubs. The build stays green; the runtime fails for any flow execution until PR 2.

### PR 2 — `compileFlow` + YAML migration (Sonnet, ~2 days)
- One implementation of `compileFlow` that walks rounds and emits PlanNodes
- All 9 catalog YAMLs migrated to the new schema (hand-converted, validated by `validateFlow`)
- Template context resolution: engine populates `rounds.<id>.outputs`, `currentRound.*`, `revision.*` automatically
- Old compilers deleted
- Existing engine tests updated to use the new YAMLs
- The route handler unchanged at this point — it calls `compileFlow` instead of the old per-shape compilers, but the SSE events still use old event names

Verification: every existing benchmark run in `/bench` reproduces.

### PR 3 — MCP server + route handler + new SSE events (Sonnet, ~1 day)
- `vada__consult` and `vada__deliberate` updated for new agent_config shape
- Route handler emits new SSE event names (`round_started`, `round_completed`, `revision_started`) and drops the old ones
- Temporarily emit BOTH old and new events to let PR 4 land independently

### PR 4 — UI rewrite (Sonnet, ~2-3 days)
- New components: `FlowFeed`, `RoundColumn`, `AgentGrid`, `AgentChain`, `AgentCard`, `useFlowState`
- Delete: `RoundStrip`, `Round`, `RoundView`, `useRoundStrip`, dead empty-state logic
- New event-handling: subscribe to `round_started`, `round_completed`, `revision_started`, `agent_completed`
- Drop subscriptions to deprecated events

Total: 4 PRs, 5-7 days end-to-end if dispatched serially.

### Cleanup PR — Drop deprecated event emission (~½ day, mechanical)
- Route handler stops emitting old events
- Verify no callers depend on them

## Open questions for Principal review

**OQ-1 — `agent_failure` defaulting.** Should each round have to declare `agent_failure` explicitly, or is there a sensible default?
- Lean: default to `continue` for parallel rounds (vendor diversity assumption), `abort` for serial rounds (the chain breaks without a link). Override per round as needed.

**OQ-2 — Round names vs round ids.** Today, `round` in SSE events is an integer (`round: 1`, `round: 2`). In the new architecture, do we send `round_id` (string, matches the YAML) or keep an integer index, or both?
- Lean: `round_id` (string) is the canonical identifier sent in SSE events. Plus `repeat_index` (integer, 0-based) for multi-repeat rounds. Drop integer round numbers from the API surface entirely.

**OQ-3 — How does the UI label round repeats?**
- Lean: "Round 1 of 3" style.

**OQ-4 — Does `agent_config` still target by agent name only, or does it need round-id awareness?**
- Lean: keep flat `Record<agentName, modelId>` — applies to that agent wherever it appears. Per-round-per-agent overrides are a future feature if anyone asks.

**OQ-5 — What happens to `output_format: structured` agents?**
- Lean: `agent_completed` payload becomes `{ id, agent, round_id, repeat_index, content, structured?: object, error? }`. The UI checks for the `structured` field and renders it via the existing `ConclusionPanel` logic if present. `synthesis_complete` event goes away.

**OQ-6 — Should `display_name` and `description` apply to the flow, the round, or both?**
- Lean: round has `name` (required, shown in UI), `description?` (optional, shown in tooltip on hover if present). Same as flow.

**OQ-7 — Audit "FLAG" signal robustness.**
- Lean: keep `contains` semantics for v1. Add `signal.type: 'matches'` (regex) and `signal.type: 'structured_field'` as future work.

**OQ-8 — Empty rounds (rounds with no agents).** Reject at validation. Already in the validation rules above.

**OQ-9 — Inline vs referenced agent definitions in rounds.** Reference by name. Already in the schema above.

**OQ-10 — Migration of existing sessions.** No data migration needed. spec_id is a stable identifier.

## What I need from you, Dani

1. **Confirm the conceptual model.** Universal rounds, declarative revision, `on_failure` schema.
2. **Confirm the data flow model.** Implicit template context (Option A), with `inputs:` declaration as future work.
3. **Confirm the within-round input model.** `message_template` at round level, optional agent-level override.
4. **Resolve OQ-1 through OQ-10.** Most have explicit leans; push back where wrong.
5. **Confirm the rollout sequencing.** 4 PRs as described, or different shape?
6. **Confirm the docs trail.** Design doc here, D-033 entry in `vada-decisions.md`, then exec briefs sequenced.
7. **Anything you want flagged but I missed.**

Once these are settled, I write the D-033 decision log entry (added to the same `design/generic-flow-refactor` branch as a second commit), and then the first brief (PR 1 — schema + types).
