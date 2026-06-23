---
name: vada-yaml-authoring
description: How to create and register v2 YAML deliberation specs. Load when adding a new team or new YAML spec. Covers all four flow shapes (solo, brokered ± synthesis, rounds + audit) under the universal round-based schema, auto-discovery, and verify scripts.
---

# YAML Deliberation Specs — Authoring Guide

## What a YAML Spec Is

A YAML spec is a complete, self-contained deliberation configuration. It defines agents (with system prompts, tools, classifier behavior) and a sequence of rounds (each with agents, layout, optional repeats, optional declarative revision). The engine converts the spec to a compiled Plan via `compileFlow`; the adapter executes the Plan.

As of D-033 (vada-decisions.md, May 12-13, 2026), all flows use **schema version 2.0** — the universal round-based model. The three v1 shapes (brokered-no-synthesis, brokered-with-synthesis, rounds-based) collapsed into one schema. The compiler detects which shape a YAML expresses from its topology and emits matching Plan node ids.

File location: `packages/agents/vada-deliberation/yamls/<spec-id>.yaml` (no version suffix — see global D-013 + vada-decisions.md D-025).

Full schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`.

Design rationale: `apps/vada-ai/specs/generic-flow-refactor.md` and vada-decisions.md D-033.

---

## The four flow shapes

The schema is uniform but the topology determines runtime behaviour. `compileFlow` detects four shapes:

| Shape | Trigger (topology) | Use case | Catalog example |
|-------|--------------------|----------|-----------------|
| `solo` | 1 round, 1 agent | Single-agent baseline | `a0-baseline.yaml`, `a1-baseline.yaml` |
| `brokered-no-synth` | 1+ rounds, last round has >1 agent, no `on_failure: revise` | Independent parallel reviewers, no synthesis | `vada-reviewers.yaml`, `brokered-trio.yaml`, `brokered-quartet.yaml` |
| `brokered-synth` | 2+ rounds, last round has exactly 1 agent, no `on_failure: revise` | Parallel reviewers + single synthesizer | `vada-reviewers-synthesis.yaml` |
| `rounds-audit` | Any round has `on_failure.action: 'revise'` | Multi-round debate + synthesis + audit + revision | `sparring.yaml`, `crucible.yaml`, `war-room.yaml` |

You do not declare the shape. The schema is the same. `compileFlow` infers it from the rounds you define.

---

## Quick Recipe: Solo (baseline)

Copy from `a0-baseline.yaml` and adapt.

```yaml
schema_version: "2.0"
id: my-baseline
display_name: My Baseline
description: Single-agent direct answer.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: MyAgent
    description: Direct answer baseline.
    classifier:
      mode: skip
    system_prompt: |
      You are MyAgent. Answer the user's question directly.

rounds:
  - id: answer
    name: Answer
    layout: serial
    agents:
      - name: MyAgent
    message_template: "{{question}}"
```

---

## Quick Recipe: Brokered (parallel reviewers, no synthesis)

Copy from `vada-reviewers.yaml` and adapt.

```yaml
schema_version: "2.0"
id: my-reviewers
display_name: My Reviewers
description: Three independent reviewers, no synthesis.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: ReviewerA
    classifier:
      mode: skip                          # brokered reviewers always skip
    system_prompt: |
      You are ReviewerA...

  - name: ReviewerB
    classifier:
      mode: skip
    system_prompt: |
      You are ReviewerB...

  - name: ReviewerC
    classifier:
      mode: skip
    system_prompt: |
      You are ReviewerC...

rounds:
  - id: review
    name: Reviewers
    layout: parallel                      # reviewers run independently
    agents:
      - name: ReviewerA
      - name: ReviewerB
      - name: ReviewerC
    message_template: "{{question}}"
```

The shape is `brokered-no-synth` because there is exactly one round with more than one agent and no `on_failure: revise`. `compileFlow` emits node ids `reviewer-ReviewerA`, `reviewer-ReviewerB`, `reviewer-ReviewerC`.

---

## Quick Recipe: Brokered with synthesis

Copy from `vada-reviewers-synthesis.yaml` and adapt.

```yaml
schema_version: "2.0"
id: my-reviewers-synthesis
display_name: My Reviewers + Synthesis
description: Three reviewers in parallel, then a synthesizer reconciles.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: ReviewerA
    classifier: { mode: skip }
    system_prompt: |
      You are ReviewerA...

  - name: ReviewerB
    classifier: { mode: skip }
    system_prompt: |
      You are ReviewerB...

  - name: ReviewerC
    classifier: { mode: skip }
    system_prompt: |
      You are ReviewerC...

  - name: Synthesizer
    classifier: { mode: skip }
    output_format: structured
    output_schema:
      type: object
      properties:
        recommendation: { type: string }
        key_tradeoff: { type: string }
      required: [recommendation, key_tradeoff]
    system_prompt: |
      You are the Synthesizer. Reconcile the reviewers...

rounds:
  - id: review
    name: Reviewers
    layout: parallel
    agents:
      - name: ReviewerA
      - name: ReviewerB
      - name: ReviewerC
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

      Please synthesize:
```

The shape is `brokered-synth` because there are 2+ rounds, the last round has exactly one agent, and there is no `on_failure: revise`. `compileFlow` emits node ids `reviewer-{name}` + `brokered-synthesis`.

**Critical**: the synthesis template must use `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}` to receive the reviewer responses. The pre-D-033 v1 YAML referenced `{{reviewerResponses}}` — the engine never populated that variable, and the synthesizer ran blind in production. The PR #47 migration fixed this; do not reintroduce the broken pattern.

---

## Quick Recipe: Rounds + audit + revision

Copy from `sparring.yaml` and adapt.

```yaml
schema_version: "2.0"
id: my-debate
display_name: My Debate
description: Two agents debate across rounds, synthesize, audit, revise on FLAG.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: AgentOne
    tools: [web_search]
    classifier:
      mode: auto                          # reasoning agents use auto
    system_prompt: |
      You are AgentOne. Your job is...

  - name: AgentTwo
    tools: [web_search]
    classifier:
      mode: auto
    system_prompt: |
      You are AgentTwo. Your job is...

  - name: ConclusionSynthesizer
    description: Produces the final structured verdict
    output_format: structured
    output_schema:
      type: object
      properties:
        recommendation: { type: string }
        key_condition: { type: string }
      required: [recommendation, key_condition]
    classifier:
      mode: skip                          # commit agent; no tools
    system_prompt: |
      You are producing the final conclusion...

  - name: BlindCritic
    classifier:
      mode: skip
    system_prompt: |
      You are the Blind Auditor. If the conclusion is flawed, write FLAG followed by why...

  - name: FactChecker
    tools: [web_search, web_fetch]
    classifier:
      mode: auto
    system_prompt: |
      You are the Fact Auditor. If the conclusion contains factual errors, write FLAG...

rounds:
  - id: debate
    name: Debate
    layout: serial
    repeats: 3
    agents:
      - name: AgentOne
      - name: AgentTwo
    message_template: |
      {{#if roundIndex}}
      Transcript so far:
      {{#each outputsByRound}}{{#each this}}[Round {{@../index}} — {{this.agentName}}]
      {{this.content}}
      ---
      {{/each}}{{/each}}
      Question: {{question}}
      {{else}}
      {{question}}
      {{/if}}

  - id: synthesis
    name: Synthesis
    layout: serial
    agents:
      - name: ConclusionSynthesizer
    message_template: |
      The original question is: "{{question}}"
      Participants: {{participants}}
      Deliberation transcript:
      {{#each outputsByRound}}{{#each this}}[Round {{@../index}} — {{this.agentName}}]
      {{this.content}}
      ---
      {{/each}}{{/each}}
      {{#if isRevision}}
      Audit feedback from the prior pass:
      {{#each auditOutputs}}[{{this.agentName}}] {{this.content}}
      {{/each}}
      Revise your conclusion accordingly.
      {{/if}}
      GENERATE THE JSON NOW:

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
      target: synthesis                   # MUST be a prior round id (Rule 3)
      max_revisions: 1
      signal:
        type: contains                    # v2 ships with 'contains' only (D-034)
        value: FLAG
        case_sensitive: false
```

The shape is `rounds-audit` because the audit round declares `on_failure.action: 'revise'`. `compileFlow` emits node ids `round-{r}-{agent}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`, and wires the conditional revision edge from the last auditor back to the next terminal (or to `__END__` after `max_revisions`).

---

## Registering — auto-discovery

New YAMLs are **auto-discovered**. The engine's `listPublicSpecs()` uses `readdirSync` to enumerate `packages/agents/vada-deliberation/yamls/`; the MCP `spec-registry.ts` delegates to it. Just creating the YAML file is enough for it to appear in the catalog and in MCP tool enums.

`validateAllSpecs()` runs at startup — a malformed YAML crashes the server on start. This is intentional (fail-fast). The 10 validation rules from D-033 are enforced by `validateFlow` (called by `loadFlow`).

To hide a spec from the public `/teams` catalog (while keeping it in the catalog for benchmarks), set `experimental: true` at the top level. The 7 experimental YAMLs use this today (PR #31 unpublished Crucible, Sparring, War Room).

To make a spec addressable by a short alias from `vada__deliberate`, add it to the `ALIASES` map in `spec-registry.ts`:

```ts
// Only add if you need a short-name (e.g. 'a0' → 'a0-baseline')
// Most specs are addressed by their full id and need no alias
'my-alias': 'my-spec',
```

---

## Writing a Verify Script

Create `apps/vada-ai/web/scripts/verify-<spec-name>.ts`:

```ts
import { compileFlow, loadFlow, loadYamlFromCatalog } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1) }

const adapter = new LangGraphAdapter({ apiKey })
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'

const flow = loadYamlFromCatalog('my-spec')

const plan = compileFlow(flow, 'Should a startup prioritize growth speed or sustainable unit economics?', model)
const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 1_200_000 })

console.info(`terminalState: ${conclusion.terminalState}`)
console.info(`Transcript length: ${conclusion.transcript.length}`)
for (const output of conclusion.transcript) {
  const roundTag = output.roundIndex !== undefined ? ` r${output.roundIndex}` : ''
  console.info(`  - ${output.agentName}${roundTag} → ${output.tokensInput}in/${output.tokensOutput}out`)
}
```

Run with: `ANTHROPIC_API_KEY=sk-... bun run scripts/verify-my-spec.ts`

Valid terminal states: `CLEAN`, `REVISED`, `MAX_REVISIONS` — all three are success.

Note the API surface: `loadFlow` and `compileFlow` replaced the v1 `loadSpec` / `compileSpec` in PR #47. The old names no longer exist in `@atta/engine`.

---

## Classifier Mode Guidance

| Situation | Use |
|-----------|-----|
| Reasoning agent in a debate round (e.g. AgentOne, AgentTwo with web_search) | `auto` — classifier decides per-turn based on whether the question needs tools |
| Synthesizer that integrates claims across rounds and may need verification | `always_tools` — must always have tools; skips Haiku classifier call overhead |
| Audit agent (BlindCritic, FactChecker) | Reasoning auditors with tools: `auto`. Pure prompt auditors: `skip`. |
| Synthesizer with no tools (commit agent) | `skip` — blindness/commitment is the mechanism |
| Brokered reviewer (single-shot, no rounds) | `skip` — single-shot advisory; no classifier overhead needed |
| Baseline solo agent (A0, A1) | `skip` — single-shot baseline by definition |

Only omit `classifier` entirely for agents with no tools declared. For agents with tools, always set an explicit `classifier.mode`.

---

## The 10 validation rules (D-033)

`validateFlow` enforces these. Failures raise `InvalidFlowConfigError` at load time.

| Rule | Description |
|------|-------------|
| 1 | `rounds.length >= 1` — at least one round |
| 2 | Round ids unique within a flow |
| 3 | `on_failure.target` references a **prior** round id (no forward or self references) |
| 4 | Every `agents[].name` referenced in a round exists in the top-level `agents` array |
| 5 | `repeats >= 1` when present |
| 6 | `max_revisions >= 1` when `action='revise'` |
| 7 | `action='revise'` requires both `target` and `max_revisions` |
| 8 | Either the round has `message_template` OR every agent in the round has its own |
| 9 | Rounds with zero agents are rejected |
| 10 | `agent_failure` defaults: `continue` for `parallel`, `abort` for `serial`. Explicit declaration always wins. |

---

## Anti-patterns

- ❌ Using `schema_version: "1.0"` — v1 is gone. The engine accepts `schema_version: "2.0"` only (D-033).
- ❌ Using v1 keys (`flow.rounds`, `flow.synthesis`, `flow.audit`, top-level `reviewers`, `response`) — the engine no longer parses them. Use `rounds[]` with one entry per phase.
- ❌ Importing `loadSpec` or `compileSpec` from `@atta/engine` — those exports were deleted in PR #47. Use `loadFlow` / `compileFlow`.
- ❌ Referencing `{{reviewerResponses}}` in a synthesis template — that variable was never populated. Use `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}` instead.
- ❌ Setting `signal.type: 'equals'` or `'matches'` — v2 ships with `contains` only. The engine throws explicitly on others (D-034). The schema reserves them for future extensibility, but compileFlow currently rejects them.
- ❌ Defining team logic in TypeScript — it belongs in YAML (`@vada/teams` was deleted long before D-033).
- ❌ Adding a YAML to a static `SPECS` map — the registry is dynamic; just create the file. `validateAllSpecs()` will discover and validate it at startup.
- ❌ Agent name mismatch between round `agents[].name` and top-level `agents[].name` — exact case-sensitive match required (validation Rule 4).
- ❌ Setting `classifier.mode: always_tools` for a pure audit agent — defeats the audit-as-blindness mechanism.
- ❌ Omitting `classifier` on a tool-enabled agent — be explicit. Implicit `skip` means tools are silently dropped.
- ❌ Adding `tools` to `agents[]` without verifying the tool name exists in the adapter registry (`tools.ts` in `@atta/adapter-langgraph`).
- ❌ Targeting `on_failure.target` to the same round or a later round — Rule 3 rejects this. Audit rounds must come after their revision target.
- ❌ Adding `-v1` / `-v2` suffix to a filename or `id` — global D-013 + vada-decisions.md D-025 keep filenames unversioned. Version history lives in git + decision logs.
- ❌ Not writing a verify script — silent regressions are the enemy.

---

## When you need more context

- Full schema reference (worked examples for all 4 shapes, template variables, validation rules): `apps/vada-ai/specs/yaml-schema-reference.md`
- Engine internals (`compileFlow` shape detection, Plan node id conventions, the `Flow` and `Round` types): **atta-engine** skill
- Spec registry + MCP exposure: **vada-mcp-server** skill
- Classifier behavior + SDK-shape dispatch: **atta-adapter-langgraph** skill
- Architecture overview + locked decisions: **vada-architecture** skill
- Design rationale for the universal round-based schema: `apps/vada-ai/specs/generic-flow-refactor.md`
- vada-decisions.md D-033 + D-034 (engine vocabulary + signal type cleanup)
