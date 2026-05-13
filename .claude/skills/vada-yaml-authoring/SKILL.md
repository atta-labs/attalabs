---
name: vada-yaml-authoring
description: How to create and register v2 YAML deliberation specs. Load when adding a new team or new YAML spec. Covers the universal round-based schema, the four shapes (solo, brokered ± synthesis, rounds-audit), spec-registry registration, and verify scripts.
---

# YAML Deliberation Specs — Authoring Guide (v2)

## What a YAML Spec Is

A YAML spec is a complete, self-contained deliberation configuration. As of D-033 (schema v2), every spec follows one universal model: **a flow is a sequence of rounds**. The shape of the deliberation (solo, brokered with or without synthesis, rounds with audit and revision) emerges from how the rounds are structured — not from a top-level discriminator.

The engine converts the spec to a compiled Plan via `compileFlow`; the adapter executes the Plan.

File location: `apps/vada-ai/yamls/<spec-id>.yaml` (no `-v1` suffix — see D-025)

Full schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`

---

## The four shapes (auto-detected from `rounds[]`)

`compileFlow` detects four shapes from the flow's topology:

| Shape | Trigger | Use for |
|-------|---------|---------|
| `solo` | 1 round, 1 agent | Baselines (A0, A1), single-agent variants |
| `brokered-no-synth` | 1+ rounds, last round has >1 agent, no `on_failure: revise` | Parallel reviewers (Reviewers, Brokered Trio, Brokered Quartet) |
| `brokered-synth` | 2+ rounds, last round has exactly 1 agent, no `on_failure: revise` | Reviewers + synthesizer (Reviewers + Synthesis) |
| `rounds-audit` | Any round has `on_failure.action: 'revise'` | Multi-round debate with audit and revision (Sparring, Crucible, War Room) |

Don't declare the shape — the engine figures it out from the rounds. Make sure the rounds you declare match the pattern you want.

---

## Recipe 1: New solo spec (baseline-style)

Copy the structure from `a0-baseline.yaml`.

```yaml
schema_version: "2.0"
id: my-solo                              # unique kebab-case, matches filename
display_name: My Solo
description: One-sentence description.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: MyAgent
    description: Single-agent baseline
    classifier: { mode: skip }            # single-shot baseline; no tools, no classifier
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

## Recipe 2: New brokered-no-synth spec (parallel reviewers, no synthesizer)

Copy the structure from `vada-reviewers.yaml` or `brokered-trio.yaml`.

```yaml
schema_version: "2.0"
id: my-reviewers
display_name: My Reviewers
description: Three reviewers respond independently.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: ReviewerA
    description: Reviewer A
    classifier: { mode: skip }
    system_prompt: |
      You are an external critical reviewer...

  - name: ReviewerB
    description: Reviewer B
    classifier: { mode: skip }
    system_prompt: |
      You are an external critical reviewer...

  - name: ReviewerC
    description: Reviewer C
    classifier: { mode: skip }
    system_prompt: |
      You are an external critical reviewer...

rounds:
  - id: review
    name: Independent Review
    layout: parallel
    agents:
      - name: ReviewerA
      - name: ReviewerB
      - name: ReviewerC
    message_template: "{{question}}"      # all three reviewers see this; engine fans it out
```

You can also override the message template per-agent (e.g. if each reviewer needs a different brief):

```yaml
    agents:
      - name: ReviewerA
        message_template: "{{question}}\n\nFocus on logical structure."
      - name: ReviewerB
        message_template: "{{question}}\n\nFocus on factual accuracy."
      - name: ReviewerC
        message_template: "{{question}}\n\nFocus on edge cases."
```

Validation Rule 8 requires either a round-level `message_template` OR a per-agent template on every agent (not both omitted).

---

## Recipe 3: New brokered-synth spec (reviewers + synthesizer)

Copy the structure from `vada-reviewers-synthesis.yaml`.

```yaml
schema_version: "2.0"
id: my-reviewers-synth
display_name: My Reviewers + Synthesis
description: Three reviewers respond, then a synthesizer reconciles their outputs.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: ReviewerA
    classifier: { mode: skip }
    system_prompt: |
      You are an external critical reviewer...
  - name: ReviewerB
    classifier: { mode: skip }
    system_prompt: |
      You are an external critical reviewer...
  - name: ReviewerC
    classifier: { mode: skip }
    system_prompt: |
      You are an external critical reviewer...
  - name: Synthesizer
    role: synthesizer
    output_format: structured
    output_schema:
      type: object
      properties:
        recommendation: { type: string }
        consensus: { type: array, items: { type: string } }
        contradictions: { type: array, items: { type: string } }
      required: [recommendation]
    classifier: { mode: skip }
    system_prompt: |
      You are a synthesizer. Combine the reviewers' outputs into a structured synthesis...

rounds:
  - id: review
    name: Independent Review
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

      Synthesize these into the structured format defined in your system prompt.
```

**Important**: use `{{#each allPreviousOutputs}}...{{/each}}` in the synthesizer's `message_template` to feed reviewer outputs into the synthesizer. A prior version of this YAML referenced `{{reviewerResponses}}`, which the engine never populates — the synthesizer ran blind. The v2 migration (PR #47) fixed this.

---

## Recipe 4: New rounds-audit spec (multi-round debate + synthesis + audit + revision)

Copy the structure from `sparring.yaml` or `crucible.yaml`.

```yaml
schema_version: "2.0"
id: my-debate
display_name: My Debate
description: N agents debate across R rounds; synthesizer commits; auditors verify; revise on FLAG.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: AgentOne
    description: Reasoning agent
    tools: [web_search]
    classifier: { mode: auto }            # reasoning agents use auto
    system_prompt: |
      You are AgentOne...

  - name: AgentTwo
    description: Reasoning agent
    tools: [web_search]
    classifier: { mode: auto }
    system_prompt: |
      You are AgentTwo...

  - name: ConclusionSynthesizer
    description: Produces the final structured verdict
    output_format: structured
    output_schema:
      type: object
      properties:
        recommendation: { type: string }
        key_condition: { type: string }
      required: [recommendation, key_condition]
    classifier: { mode: skip }
    system_prompt: |
      You are producing the final conclusion...

  - name: BlindCritic
    classifier: { mode: skip }
    system_prompt: |
      You are the Blind Auditor...

  - name: FactChecker
    tools: [web_search, web_fetch]
    classifier: { mode: auto }
    system_prompt: |
      You are the Fact Auditor...

rounds:
  - id: debate
    name: Debate
    layout: serial
    repeats: 3                            # three repeats of the debate round
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
      {{#if isRevision}}
      The previous conclusion was flagged. Audit feedback: {{auditOutputs.[0].content}}
      Original question: "{{question}}"
      Transcript: {{#each outputsByRound}}{{#each this}}[{{this.agentName}}] {{this.content}}{{/each}}{{/each}}
      Regenerate the JSON.
      {{else}}
      Original question: "{{question}}"
      Transcript: {{#each outputsByRound}}{{#each this}}[{{this.agentName}}] {{this.content}}{{/each}}{{/each}}
      Generate the JSON now.
      {{/if}}

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
      target: synthesis                   # MUST be a PRIOR round id (validation Rule 3)
      max_revisions: 1
      signal:
        type: contains                    # v2 ships with 'contains' only; equals/matches reserved
        value: FLAG
        case_sensitive: false
```

---

## Registering in spec-registry.ts

New YAMLs are **auto-discovered** — `spec-registry.ts` delegates to `@atta/engine`'s `listPublicSpecs()` (which uses `readdirSync`). Just creating the YAML file is enough for it to appear in `listPublicSpecs()`.

To make a spec addressable by a short alias from `vada__deliberate`, add it to the `ALIASES` map in `spec-registry.ts`:

```ts
// Only add if you need a short-name (e.g. 'a0' → 'a0-baseline')
// Most specs are addressed by their full id and need no alias
'my-alias': 'my-spec',
```

`validateAllSpecs()` runs at startup — a malformed YAML crashes the server on start. This is intentional (fail-fast).

To unpublish a spec from the public `/teams` catalog, add `experimental: true` at the top level. `listPublicSpecs()` filters it out, but the spec remains addressable by explicit `spec_id`.

---

## Writing a Verify Script

Create `apps/vada-ai/web/scripts/verify-<spec-name>-port.ts`:

```ts
import { compileFlow, loadFlow } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1) }

const adapter = new LangGraphAdapter({ apiKey })
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'

const flow = loadFlow(readFileSync(join(process.cwd(), '../yamls/my-spec.yaml'), 'utf-8'))

const plan = compileFlow(flow, 'Should a startup prioritize growth speed or sustainable unit economics?', model)
const conclusion = await adapter.execute({ plan, customVars: {}, timeoutMs: 1_200_000 })

console.info(`terminalState: ${conclusion.terminalState}`)
console.info(`Transcript length: ${conclusion.transcript.length}`)
for (const output of conclusion.transcript) {
  const roundTag = output.roundIndex !== undefined ? ` r${output.roundIndex}` : ''
  console.info(`  - ${output.agentName}${roundTag} → ${output.tokensInput}in/${output.tokensOutput}out`)
}
```

Run with: `ANTHROPIC_API_KEY=sk-... bun run scripts/verify-my-spec-port.ts`

Valid terminal states: `CLEAN`, `REVISED`, `MAX_REVISIONS` — all three are success.

---

## Classifier Mode Guidance

| Situation | Use |
|-----------|-----|
| Reasoning agent (Strategist, Critic, Devil's Advocate, multi-round debate agents) | `auto` — let classifier decide per-turn based on whether the question needs web search |
| Synthesizer that integrates claims across rounds | `always_tools` — must always have tools for verification; skips the Haiku call overhead |
| Audit agent (BlindCritic, ConclusionSynthesizer, FactChecker when used as auditor) | `skip` — blindness/commitment is the mechanism; tools would contaminate the role |
| Brokered reviewer (single-shot, no rounds) | `skip` — single-shot advisory; no classifier overhead needed |
| Baseline solo agent (A0, A1) | `skip` — single-shot baseline by definition |

Only omit `classifier` entirely for agents with no tools declared. For agents with tools, always set an explicit `classifier.mode`.

---

## Template Variables (v1 TemplateState — still active in v2 YAMLs)

The adapter has not been refactored as part of D-033 (see OQ-H in `vada-state.md`). v2 YAMLs use the same Handlebars variable names as v1:

| Variable | Description |
|----------|-------------|
| `{{question}}` | Full question string |
| `{{roundIndex}}` | 0-based current repeat index |
| `{{outputsByRound.[0]}}` | All outputs from repeat 0 (bracket syntax for numeric keys) |
| `{{allPreviousOutputs}}` | Flat array of all `AgentOutput` produced before this node |
| `{{lastOutputByAgent.AgentName}}` | Most recent output from a named agent |
| `{{conclusion}}` | Most recent terminal output (synthesis content) |
| `{{auditOutputs.[0].content}}` | First auditor's output (used in revision templates) |
| `{{isRevision}}` | `true` when this execution is a revision |
| `{{participants}}` | Comma-separated list of round agent names |
| `{{customVars.X}}` | Any caller-supplied runtime variable |

The D-033 design contemplated round-namespaced variables (`{{rounds.<id>.outputs}}`, `{{currentRound.prior_agents}}`, `{{revision.source_outputs}}`) but that change requires adapter refactoring and is deferred. Write v2 YAMLs using the v1 variable names listed above.

---

## Anti-patterns

- ❌ Defining team logic in TypeScript — it belongs in YAML (the `@vada/teams` package is deleted; v1 workflow union types are deleted)
- ❌ Adding a YAML to a static `SPECS` record — the registry is dynamic; just create the file
- ❌ Agent name mismatch between `rounds[].agents[].name` references and top-level `agents[].name` — exact case-sensitive match required (validation Rule 4)
- ❌ Round with zero agents (validation Rule 9) — every round needs at least one agent
- ❌ Round with no `message_template` AND no per-agent templates (validation Rule 8) — at least one source must provide the template
- ❌ `on_failure.target` pointing to a future round or to itself (validation Rule 3) — only prior rounds can be revision targets
- ❌ `on_failure.action: 'revise'` without `target` or `max_revisions` (validation Rule 7) — both required for revise
- ❌ Setting `classifier.mode: always_tools` for an audit agent — defeats the audit mechanism
- ❌ Omitting `classifier` on a tool-enabled agent — be explicit
- ❌ Adding `tools` to `agents[]` without verifying the tool name exists in the adapter registry (`tools.ts` in `@atta/adapter-langgraph`)
- ❌ Using `signal.type: 'equals'` or `'matches'` — the schema reserves these but the engine throws at compile time (v2 ships with `contains` only)
- ❌ Using `{{reviewerResponses}}` in a synthesizer template — that variable was never populated; use `{{#each allPreviousOutputs}}{{this.agentName}}: {{this.content}}{{/each}}` instead
- ❌ Not writing a verify script — silent regressions are the enemy

---

## Migration from v1 specs

For pre-D-033 specs you may encounter in legacy material, the shape mapping is:

| v1 construct | v2 equivalent |
|---|---|
| `reviewers: [{agent, message_template}]` (top-level) | `rounds[0]` with `layout: parallel` and the same agents |
| `flow.rounds: { count, agents }` | A single round with `repeats` set and the same agents |
| `flow.synthesis: { agent, message_template }` | A separate single-agent round after the parallel rounds |
| `flow.audit: { agents, message_template, revision: { max, trigger } }` | A separate round with `on_failure: { action: revise, target, max_revisions, signal }` |
| `response: { mode: concatenate }` | Implicit — brokered-no-synth shape, no synthesizer round |
| `response: { mode: synthesize }` | Implicit — brokered-synth shape, last round has 1 agent |

System prompts, classifier modes, output schemas, tools, and agent definitions carry over verbatim. Only the structural shape changes. All 9 catalog YAMLs were migrated in PR #47.

---

## When you need more context

- Full schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`
- Engine types (`Flow`, `Round`, `AgentInRound`, `OnFailureSpec`, `FailureSignal`, `FlowAgent`): **atta-engine** skill
- Spec registry + MCP exposure: **vada-mcp-server** skill
- Classifier behavior: **atta-adapter-langgraph** skill
- Cost calculator integration: `apps/vada-ai/web/src/lib/calculator.ts` (reads Flow shape directly via `flow-helpers.detectShape`)
