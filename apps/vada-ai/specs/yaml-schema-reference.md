# YAML Deliberation Spec — Schema Reference

Schema version: `2.0`

This document is the canonical reference for the v2 YAML schema used by Vāda. The schema collapses the three v1 shapes (brokered-no-synthesis, brokered-with-synthesis, rounds-based) into a single universal model: **a flow is a sequence of rounds**. Every deliberation pattern is expressed as round structure plus optional declarative revision via `on_failure`. The engine has one compiler — `compileFlow` — that walks rounds and emits the Plan graph.

For the architectural rationale behind v2, see `generic-flow-refactor.md` and D-033 in `vada-decisions.md`. For implementation status, see `vada-state.md`.

---

## Top-Level Fields

```yaml
schema_version: "2.0"            # required; must be "2.0"
id: sparring                     # required; unique kebab-case slug, matches the filename
display_name: Sparring           # required; human-facing name
description: Two-agent debate…   # required; one-line summary
experimental: false              # optional; default false. Hides from listPublicSpecs() if true.
benchmarked: false               # optional; default false. Marks as part of benchmark corpus.

defaults:
  model: claude-sonnet-4-6       # required; model for any agent without an explicit model
  max_tokens: 4096               # optional; default max_tokens for agents

agents:                          # required; non-empty list of agent definitions (see below)
  - name: …

rounds:                          # required; non-empty list of round definitions (see below)
  - id: …
```

The `id` field must match `^[a-z0-9-]+$` (kebab-case) and equal the YAML filename without the `.yaml` extension. No version suffixes — see D-013 + D-025.

---

## Agents

Each spec defines all agents referenced anywhere in `rounds`. The schema enforces that every agent name used in a round exists in the top-level `agents` array (validation Rule 4).

```yaml
agents:
  - name: Strategist                  # required; unique within spec, free-form (often PascalCase)
    description: Maps the landscape   # optional; short role description
    system_prompt: |                  # required; the agent's system prompt (multi-line)
      You are the Strategist...
    model: claude-sonnet-4-6          # optional; overrides defaults.model
    max_tokens: 4096                  # optional; overrides defaults.max_tokens
    tools:                            # optional; logical tool names
      - web_search
      - web_fetch
    classifier:
      mode: auto                      # optional; one of: auto | skip | always_tools
      budget: 5                       # optional; max tool calls per turn (default: 5)
    output_format: structured         # optional; "text" (default) or "structured"
    output_schema:                    # optional; JSON Schema (used when output_format: structured)
      type: object
      properties:
        recommendation: { type: string }
      required: [recommendation]
    editable: true                    # optional; surface this agent in the UI's reviewer config picker
    role: synthesizer                 # optional; presentation hint for UI rendering — not consumed by the engine
```

### `classifier.mode` Values

| Mode | Behavior |
|------|----------|
| `auto` | Classifier (Haiku) runs before the agent turn to decide which tools are needed and set the budget. Default for tool-enabled reasoning agents. |
| `skip` | No classifier injected, no tools passed to the agent. Use for audit agents, synthesizers, and most brokered reviewers. |
| `always_tools` | Classifier skipped; agent receives its full declared tool list with default budget. Use for agents that must always have tools. |

If `classifier` is omitted entirely, behavior defaults to `skip` (no classifier, no tools).

---

## Rounds

A round is a phase of execution. The engine walks the `rounds` array in order; each round produces an array of outputs that feeds into subsequent rounds via the template context.

```yaml
rounds:
  - id: debate                       # required; kebab-case, unique within flow (validation Rule 2)
    name: Debate                     # required; human-readable display name (UI surfaces this)
    layout: serial                   # required; "serial" | "parallel"
    repeats: 3                       # optional; default 1 (must be >= 1 — validation Rule 5)
    agents:                          # required; non-empty (validation Rule 9)
      - name: Strategist             # required; must exist in top-level agents[] (Rule 4)
        message_template: "…"        # optional; overrides round.message_template for this agent
      - name: Critic
    message_template: |              # optional at round level if every agent has its own (Rule 8)
      {{question}}                   # Handlebars template; rendered against TemplateState per node
    agent_failure: continue           # optional; "abort" | "continue".
                                     # Default: parallel→continue, serial→abort (Rule 10 derivation)
    on_failure:                      # optional; declarative failure/revision behaviour (see below)
      action: …
```

### Round fields explained

- **`id`** — kebab-case identifier, unique within the flow's `rounds`. Used in template contexts and as the target of `on_failure.target`.
- **`name`** — human-readable label rendered in the UI (e.g. "Reviewers", "Synthesis", "Audit").
- **`layout`** — describes the conceptual relationship between agents in the round.
  - `parallel` — agents run independently with no cross-visibility within the round.
  - `serial` — agents run with knowledge of prior agents' outputs in the same round (typical for synthesis-style rounds with a single agent, or for rounds that compose sequential reasoning).
- **`repeats`** — number of times the round executes. A 3-round debate is one round with `repeats: 3`.
- **`agents`** — non-empty array. Each entry references a top-level agent by `name` and may override `message_template`.
- **`message_template`** — round-level default. If absent, every agent in the round must supply its own (Rule 8). The template is Handlebars, rendered against the runtime `TemplateState` at execution time (see "Template Variables" below).
- **`agent_failure`** — per-agent error handling within the round. `continue` lets sibling agents finish even if one fails; `abort` stops the round on first failure. Default derived from layout via Rule 10.
- **`on_failure`** — round-level failure semantics; primarily used to express declarative revision (see "On-Failure / Revision" below).

---

## On-Failure / Revision

`on_failure` declares what happens when a round signals failure. The most common use is **declarative revision**: an audit round that, when it flags the previous synthesis, triggers a re-execution of an earlier round.

```yaml
rounds:
  - id: synthesis
    name: Synthesis
    layout: serial
    agents:
      - name: ConclusionSynthesizer
    message_template: |
      …

  - id: audit
    name: Audit
    layout: serial
    agents:
      - name: BlindCritic
      - name: FactChecker
    message_template: |
      Principal's question: {{question}}
      Conclusion to Review: {{conclusion}}
    on_failure:
      action: revise                 # required; "abort" | "continue" | "revise"
      target: synthesis              # required when action='revise'; must be a PRIOR round id (Rule 3)
      max_revisions: 1               # required when action='revise'; >= 1 (Rule 6)
      signal:                        # required; describes how failure is detected
        type: contains               # required; "contains" | "equals" | "matches" (see below)
        value: FLAG
        case_sensitive: false
```

### Action values

| Action | Meaning |
|--------|---------|
| `abort` | If the round signals failure, terminate the flow with `terminalState: FAILED`. |
| `continue` | Failure is recorded but the flow proceeds to subsequent rounds. |
| `revise` | Re-execute `target` (a prior round) up to `max_revisions` times. Validation Rule 3 requires `target` to be earlier in the rounds array — no forward or self references. Validation Rule 7 requires `target` and `max_revisions` to be present. |

### Signal types

The schema accepts three signal types for forward extensibility. **v2 ships with `contains` only** — the engine throws explicitly if it encounters `equals` or `matches` at compile time (D-034). `equals` and `matches` are reserved for future engine work and currently unused by any catalog YAML.

| Type | Triggers when… | Required fields | Engine support |
|------|---------------|-----------------|---------------|
| `contains` | Any audit agent's output contains `value` as a substring | `value`, optional `case_sensitive` | Active |
| `equals` | Output exactly equals `value` | `value`, optional `case_sensitive` | Reserved (compile-time error) |
| `matches` | Output matches `value` as a regex | `value`, optional `case_sensitive` | Reserved (compile-time error) |

The signal applies across the audit round's agents using "any of" semantics: if ANY agent in the round produces a matching output, the revision fires.

---

## Validation Rules (D-033)

The `validateFlow` function in `@atta/engine` enforces 10 rules. Failures raise `InvalidFlowConfigError`.

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
| 10 | `agent_failure` defaults: `continue` for `parallel`, `abort` for `serial`. Explicit declaration always wins. (Derivation rule, applied by `resolveAgentFailure()`.) |

---

## Template Variables

Templates are Handlebars, rendered against `TemplateState` at execution time. The engine's `deriveTemplateState()` produces the context for each node. **v2 templates still use the v1 TemplateState variable names** — the adapter has not been refactored to expose a new round-namespaced context. That refactor is future work (see OQ-H in `vada-state.md`).

| Variable | Available in | Description |
|----------|-------------|-------------|
| `{{question}}` | All templates | The full question string passed to `compileFlow()` |
| `{{roundIndex}}` | Round templates | 0-based index of the current repeat within the round |
| `{{totalRounds}}` | Round templates | Total `repeats` for the round |
| `{{isRevision}}` | Synthesis-style templates | `true` if this execution is a revision triggered by `on_failure: revise` |
| `{{revisionIndex}}` | Synthesis-style templates | 0-based revision count at this node's position |
| `{{outputsByRound}}` | Multi-round templates | Array of arrays — bracket syntax: `outputsByRound.[0]` |
| `{{currentRoundOutputs}}` | Same-round templates | Outputs completed in the current round before this node |
| `{{allPreviousOutputs}}` | All templates | Flat array of all `AgentOutput` produced before this node, in execution order |
| `{{outputsByAgent.AgentName}}` | All templates | All outputs from a named agent |
| `{{lastOutputByAgent.AgentName}}` | Synthesis / revision | Most recent output from a named agent |
| `{{conclusion}}` | Audit round templates | Content of the most recent terminal output (synthesis's output) |
| `{{auditOutputs}}` | Revision templates | Array of auditor outputs that triggered the revision |
| `{{participants}}` | Synthesis templates | Comma-separated list of round agent names in turn order |
| `{{customVars.X}}` | All templates | Any caller-supplied runtime variable passed via `compileFlow(flow, q, model, customVars)` |

### Synthesis template — Reviewers + Synthesis pattern

For brokered-with-synthesis flows (first round = N parallel reviewers, second round = 1 synthesizer), the synthesizer should reference reviewer outputs explicitly via `allPreviousOutputs`:

```yaml
rounds:
  - id: review
    name: Independent Review
    layout: parallel
    agents:
      - name: Gemini
        message_template: "{{question}}"
      - name: GPT
        message_template: "{{question}}"
      - name: Grok
        message_template: "{{question}}"

  - id: synthesis
    name: Synthesis
    layout: serial
    agents:
      - name: Synthesizer
    message_template: |
      The original question is: "{{question}}"

      Reviewer responses (vendor-attributed):
      {{#each allPreviousOutputs}}
      [{{this.agentName}}] {{this.content}}
      {{/each}}

      Please synthesize…
```

Prior to D-033 a `{{reviewerResponses}}` variable was referenced in the v1 `vada-reviewers-synthesis` YAML — that variable was never populated by the engine, so the synthesizer ran blind. The v2 migration fixed this in PR #47.

---

## Worked Examples

### Solo (a0-baseline, a1-baseline)

```yaml
schema_version: "2.0"
id: a0-baseline
display_name: A0
description: "Single agent, direct answer."
defaults:
  model: claude-sonnet-4-6
agents:
  - name: A0
    description: "Direct answer baseline."
    system_prompt: "Answer the user's question directly."
rounds:
  - id: answer
    name: Answer
    layout: serial
    agents:
      - name: A0
    message_template: "{{question}}"
```

### Brokered, no synthesis (vada-reviewers)

```yaml
schema_version: "2.0"
id: vada-reviewers
display_name: Reviewers
description: "Three vendor-diverse reviewers, parallel, no synthesis."
defaults:
  model: claude-sonnet-4-6
agents:
  - name: Strategist
    model: gemini-2.5-pro
    classifier: { mode: skip }
    system_prompt: "…"
  - name: Critic
    model: gpt-4o
    classifier: { mode: skip }
    system_prompt: "…"
  - name: "Devil's Advocate"
    model: grok-3
    classifier: { mode: skip }
    system_prompt: "…"
rounds:
  - id: review
    name: Reviewers
    layout: parallel
    agents:
      - name: Strategist
      - name: Critic
      - name: "Devil's Advocate"
    message_template: "{{question}}"
```

### Brokered + synthesis (vada-reviewers-synthesis)

See "Template Variables → Synthesis template" above for the full pattern.

### Rounds + audit + revision (sparring, crucible, war-room)

```yaml
schema_version: "2.0"
id: sparring
display_name: Sparring
description: "Two agents debate across three rounds; synthesizer commits; auditors verify; revise on FLAG."
defaults:
  model: claude-sonnet-4-6
agents:
  - name: Strategist
    tools: [web_search, web_fetch]
    classifier: { mode: auto }
    system_prompt: "…"
  - name: Critic
    tools: [web_search]
    classifier: { mode: auto }
    system_prompt: "…"
  - name: ConclusionSynthesizer
    output_format: structured
    output_schema: { … }
    classifier: { mode: skip }
    system_prompt: "…"
  - name: BlindCritic
    classifier: { mode: skip }
    system_prompt: "…"
  - name: FactChecker
    tools: [web_search, web_fetch]
    classifier: { mode: auto }
    system_prompt: "…"
rounds:
  - id: debate
    name: Debate
    layout: serial
    repeats: 3
    agents:
      - name: Strategist
      - name: Critic
    message_template: |
      {{#if roundIndex}}…transcript so far…{{else}}{{question}}{{/if}}

  - id: synthesis
    name: Synthesis
    layout: serial
    agents:
      - name: ConclusionSynthesizer
    message_template: |
      {{#if isRevision}}…revise based on audit feedback…{{else}}…commit…{{/if}}

  - id: audit
    name: Audit
    layout: serial
    agents:
      - name: BlindCritic
      - name: FactChecker
    message_template: |
      Principal's question: {{question}}
      Conclusion to Review: {{conclusion}}
    on_failure:
      action: revise
      target: synthesis
      max_revisions: 1
      signal:
        type: contains
        value: FLAG
        case_sensitive: false
```

---

## Loading and Compiling

```ts
import { readFileSync } from 'node:fs'
import { loadFlow, compileFlow } from '@atta/engine'

// 1. Parse + validate YAML
const flow = loadFlow(readFileSync('path/to/spec.yaml', 'utf-8'))

// 2. Compile to a Plan (model override is optional; customVars optional)
const plan = compileFlow(flow, question, model, customVars)

// 3. Execute via the adapter
const conclusion = await adapter.execute({ plan, customVars })
```

`loadFlow()` throws if the YAML fails Zod validation or `validateFlow` checks. The MCP server and route handler both validate the catalog at startup via `validateAllSpecs()` so malformed YAMLs are caught before any request is served.

---

## Compilation behaviour (shape detection)

`compileFlow` detects four shapes from the Flow's topology and emits matching `Plan` node ids so that the adapter and `resolveAuditChain` execute the graph identically across shapes.

| Detected shape | Trigger | Node ids emitted |
|----------------|---------|------------------|
| `solo` | 1 round, 1 agent | `solo` |
| `brokered-no-synth` | 1+ rounds, last round has >1 agent, no `on_failure: revise` | `reviewer-{AgentName}` |
| `brokered-synth` | 2+ rounds, last round has exactly 1 agent, no `on_failure: revise` | `reviewer-{AgentName}` + `brokered-synthesis` |
| `rounds-audit` | Any round has `on_failure.action: 'revise'` | `round-{r}-{AgentName}`, `terminal-{k}`, `audit-{Name}-{k}`, `__END__` |

Shape detection is a deliberate pragmatic choice: the engine could in principle emit a fully generic Plan graph, but the existing adapter and route handler depend on the v1 node-id conventions, so `compileFlow` preserves them. The decision is documented in D-033 as the "shape detection vs greenfield rewrite" pragmatic weakening of the original "engine has zero branches" architectural ideal.

---

## YAML Files

All built-in specs live at `packages/agents/vada-deliberation/yamls/`. New specs go here. Filenames are unversioned (D-013 + D-025).

| File | Shape | Status |
|------|-------|--------|
| `a0-baseline.yaml` | solo | Experimental (baseline) |
| `a1-baseline.yaml` | solo | Experimental (baseline) |
| `brokered-trio.yaml` | brokered-no-synth | Experimental |
| `brokered-quartet.yaml` | brokered-no-synth | Experimental |
| `vada-reviewers.yaml` | brokered-no-synth | Published |
| `vada-reviewers-synthesis.yaml` | brokered-synth | Published |
| `sparring.yaml` | rounds-audit | Experimental (PR #31 unpublished) |
| `crucible.yaml` | rounds-audit | Experimental (PR #31 unpublished) |
| `war-room.yaml` | rounds-audit | Experimental (PR #31 unpublished) |

The 7 experimental YAMLs are filtered out of the public `/teams` catalog by the `experimental: true` flag (`listPublicSpecs()` returns the 2 published only).

---

## Migration from v1

For pre-D-033 specs, the migration is structural — system prompts, classifier modes, and output schemas are preserved verbatim. The shape changes:

- `reviewers:` (v1 top-level) → `rounds[0]` with `layout: parallel`
- `flow.rounds: { count, agents }` (v1) → a single round with `repeats` set
- `flow.synthesis: { agent, message_template }` (v1) → a separate single-agent round after the parallel rounds
- `flow.audit: { agents, message_template, revision }` (v1) → a separate round with `on_failure: { action: revise, target: <synthesis-round-id>, max_revisions, signal }`

All 9 catalog YAMLs were migrated in PR #47 (D-033 PR 2).
