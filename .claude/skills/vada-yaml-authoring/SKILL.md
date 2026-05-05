---
name: vada-yaml-authoring
description: How to create and register YAML deliberation specs. Load when adding a new team or new YAML spec. Covers all four workflow types (Solo, Rounds, Custom, Brokered), spec-registry registration, and verify scripts.
paths:
  - "apps/vada-ai/yamls/**"
---

# YAML Deliberation Specs — Authoring Guide

## What a YAML Spec Is

A YAML spec is a complete, self-contained deliberation configuration. It defines agents (with system prompts, tools, classifier behavior), the flow (how rounds execute, how synthesis works, how auditing triggers revision), and response formatting. The engine converts it to a compiled Plan; the adapter executes the Plan.

YAML specs replaced the deleted `@vada/teams` TypeScript package. All deliberation logic that was previously in TypeScript Team/Workflow objects now lives in YAML.

File location: `apps/vada-ai/yamls/<spec-id>.yaml` (no `-v1` suffix — see D-025)

Full schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`

---

## Workflow Types

### RoundsWorkflow

Agents debate across N rounds. A synthesis agent commits to a conclusion. Auditors check the conclusion; if flagged, the synthesis agent revises (up to `revision.max` times).

Use for: Sparring, Crucible, War Room, A0/A1 baselines, new rounds-based deliberation variants.

### BrokeredWorkflow

Independent reviewers each see only the question. No cross-visibility, no rounds, no audit. Outputs are concatenated or synthesized.

Use for: Brokered Trio, Brokered Quartet, new advisory consultation variants.

---

## Quick Recipe: New Rounds-based Spec

Copy from `sparring.yaml` and adapt.

```yaml
schema_version: "1.0"
id: my-spec                              # unique slug — no -v1 suffix (see D-025)
display_name: My Spec
description: One-sentence description.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: AgentOne                        # PascalCase; unique
    description: What this agent does
    tools:
      - web_search
    classifier:
      mode: auto                          # reasoning agents use auto
    system_prompt: |
      You are AgentOne. Your job is...

  - name: AgentTwo
    description: What this agent does
    tools:
      - web_search
    classifier:
      mode: auto
    system_prompt: |
      You are AgentTwo. Your job is...

  - name: ConclusionSynthesizer          # always needed for rounds-based
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
      You are the Blind Auditor...

  - name: FactChecker
    tools: [web_search, web_fetch]
    classifier:
      mode: auto
    system_prompt: |
      You are the Fact Auditor...

flow:
  rounds:
    count: 3
    agents: [AgentOne, AgentTwo]
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

  synthesis:
    agent: ConclusionSynthesizer
    message_template: |
      The original question is: "{{question}}"
      Participants: {{participants}}
      Deliberation transcript:
      {{#each outputsByRound}}{{#each this}}[Round {{@../index}} — {{this.agentName}}]
      {{this.content}}
      ---
      {{/each}}{{/each}}
      GENERATE THE JSON NOW:

  audit:
    agents: [BlindCritic, FactChecker]
    message_template: |
      Principal's question: {{question}}
      Conclusion to Review: {{conclusion}}
    revision:
      max: 1
      trigger:
        type: contains
        value: FLAG
        case_sensitive: false
      logic: any
```

---

## Quick Recipe: New Reviewers-based Spec

Copy from `brokered-trio.yaml` and adapt.

```yaml
schema_version: "1.0"
id: my-brokered-spec
display_name: My Brokered Spec
description: One-sentence description.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: ReviewerA
    description: What this reviewer does
    classifier:
      mode: skip                          # brokered reviewers always skip
    system_prompt: |
      You are ReviewerA...

  - name: ReviewerB
    description: What this reviewer does
    classifier:
      mode: skip
    system_prompt: |
      You are ReviewerB...

reviewers:
  - agent: ReviewerA
    message_template: "{{question}}"
  - agent: ReviewerB
    message_template: "{{question}}"

response:
  mode: concatenate
  format: "## {agent_name}\n\n{content}\n\n---\n\n"
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

---

## Writing a Verify Script

Create `apps/vada-ai/web/scripts/verify-<spec-name>-port.ts`:

```ts
import { compileSpec, loadSpec } from '@atta/engine'
import { LangGraphAdapter } from '@atta/adapter-langgraph'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1) }

const adapter = new LangGraphAdapter({ apiKey })
const model = process.env.VADA_TEST_MODEL ?? 'claude-haiku-4-5-20251001'

const spec = loadSpec(readFileSync(join(process.cwd(), '../yamls/my-spec-v1.yaml'), 'utf-8'))

const plan = compileSpec(spec, 'Should a startup prioritize growth speed or sustainable unit economics?', model)
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
| Reasoning agent (Strategist, Critic, Devil's Advocate) | `auto` — let classifier decide per-turn based on whether the question needs web search |
| Round-Synthesizer (integrates claims across rounds) | `always_tools` — must always have tools for verification; skips the Haiku call overhead |
| Audit agent (BlindCritic, ConclusionSynthesizer) | `skip` — blindness/commitment is the mechanism; tools would contaminate the role |
| BrokeredWorkflow reviewer (single-shot, no rounds) | `skip` — single-shot advisory; no classifier overhead needed |
| Baseline solo agent (A0, A1) | `skip` — single-shot baseline by definition |

Only omit `classifier` entirely for agents with no tools declared. For agents with tools, always set an explicit `classifier.mode`.

---

## Anti-patterns

- ❌ Defining team logic in TypeScript — it belongs in YAML (the `@vada/teams` package is deleted)
- ❌ Adding a YAML to `SPECS` in `spec-registry.ts` — the registry is now dynamic; just create the file
- ❌ Agent name mismatch between `flow` references and agent `name` field — exact case-sensitive match required
- ❌ Setting `classifier.mode: always_tools` for an audit agent — defeats the audit mechanism
- ❌ Omitting `classifier` on a tool-enabled agent — be explicit
- ❌ Adding `tools` to `agents[]` without verifying the tool name exists in the adapter registry (`tools.ts` in `@atta/adapter-langgraph`)
- ❌ Using `flow.rounds` and `reviewers` in the same spec — these are mutually exclusive modes
- ❌ Not writing a verify script — silent regressions are the enemy

---

## When you need more context

- Full schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`
- Engine types (`DeliberationSpec`, `SpecAgent`, etc.): **atta-engine** skill
- Spec registry + MCP exposure: **vada-mcp-server** skill
- Tool assignment matrix: **atta-teams** skill
- Classifier behavior: **atta-adapter-langgraph** skill
