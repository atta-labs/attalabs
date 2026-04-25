# YAML Deliberation Spec — Schema Reference

Schema version: `1.0`

---

## Top-Level Fields

```yaml
schema_version: "1.0"           # required; must be "1.0"
id: sparring-v1                  # required; unique slug, used in spec-registry
display_name: Sparring           # required; human-facing name
description: Two-agent debate…  # required; one-line summary
experimental: false              # optional; default false. Hides from listPublicSpecs() if true.
benchmarked: false               # optional; default false. Marks as part of benchmark corpus.

defaults:
  model: claude-sonnet-4-6      # required; model for any agent without an explicit model
  max_tokens: 4096              # optional; default max_tokens for agents
```

---

## Agents

Each spec must define all agents it references in `flow` or `reviewers`.

```yaml
agents:
  - name: Strategist                  # required; PascalCase; unique within spec
    description: Maps the landscape   # required; short role description
    system_prompt: |                  # required; the agent's system prompt (multi-line)
      You are the Strategist...
    model: claude-sonnet-4-6          # optional; overrides defaults.model for this agent
    max_tokens: 4096                  # optional; overrides defaults.max_tokens
    tools:                            # optional; list of logical tool names
      - web_search
      - web_fetch
    classifier:
      mode: auto                      # optional; one of: auto | skip | always_tools
      budget: 5                       # optional; max tool calls per turn (default: 5)
    output_format: structured         # optional; "text" (default) or "structured"
    output_schema:                    # optional; JSON Schema object (used when output_format: structured)
      type: object
      properties:
        recommendation: { type: string }
      required: [recommendation]
```

### `classifier.mode` Values

| Mode | Behavior |
|------|----------|
| `auto` | Classifier (Haiku) runs before the agent turn to decide which tools are needed and set the budget. Default for tool-enabled reasoning agents. |
| `skip` | No classifier injected, no tools passed to the agent. Use for audit agents (BlindCritic, ConclusionSynthesizer) and all brokered reviewers. |
| `always_tools` | Classifier is skipped; agent receives its full declared tool list with the default budget. Use for agents that must always have tools (e.g. round-Synthesizer). Replaces the old name-substring hard rule. |

If `classifier` is omitted entirely, behavior defaults to `skip` (no classifier, no tools).

---

## Flow Section (rounds-based mode)

Used for autonomous deliberations: sparring, crucible, war-room, baselines.

```yaml
flow:
  rounds:                          # optional; omit for solo (synthesis-only) specs
    count: 3                       # required; number of debate rounds
    agents:                        # required; list of agent names that participate in each round
      - Strategist
      - Critic
    message_template: |            # required; Handlebars template for round messages
      {{#if roundIndex}}
      The deliberation transcript so far: ...
      {{else}}
      {{question}}
      {{/if}}

  synthesis:                       # required; the agent that produces the final conclusion
    agent: ConclusionSynthesizer
    message_template: |            # required; Handlebars template sent to synthesis agent
      {{question}}
      ...

  audit:                           # optional; omit if no audit step
    agents:                        # required; one or more auditor agent names (run in parallel)
      - BlindCritic
      - FactChecker
    message_template: |            # required; Handlebars template sent to each auditor
      Principal's question: {{question}}
      Conclusion to Review: {{conclusion}}
    revision:
      max: 1                       # required; max revision cycles (1 = one retry)
      trigger:
        type: contains             # required; "contains" | "json-field-equals" | "json-field-truthy"
        value: FLAG                # required for "contains"; the substring to look for
        case_sensitive: false      # optional; default false
        path: $.flagged            # required for json-field-* types; dot-path into JSON output
      logic: any                   # optional; "any" (default) | "all". Determines if ANY auditor or ALL auditors must trigger for revision.
```

### Revision Trigger Types

| `type` | Triggers revision when... | Required fields |
|--------|--------------------------|-----------------|
| `contains` | Auditor output contains `value` as a substring | `value` |
| `json-field-equals` | JSON field at `path` equals `value` | `path`, `value` |
| `json-field-truthy` | JSON field at `path` is truthy | `path` |

---

## Reviewers Section (brokered mode)

Used for parallel independent advisory responses. Incompatible with `flow.rounds` — a spec is either rounds-based or reviewers-based, not both.

```yaml
reviewers:
  - agent: Strategist              # required; must match an agent name in agents[]
    message_template: "{{question}}"  # required; template sent to this reviewer
  - agent: Critic
    message_template: "{{question}}"
  - agent: "Devil's Advocate"
    message_template: "{{question}}"

response:
  mode: concatenate                # required for brokered; "synthesize" or "concatenate"
  format: "## {agent_name}\n\n{content}\n\n---\n\n"  # optional; template for each reviewer's block
```

### Response Modes

| Mode | Behavior |
|------|----------|
| `synthesize` | A synthesis agent merges all outputs into a single conclusion (defined in `flow.synthesis`) |
| `concatenate` | Reviewer outputs are joined in order using `format` template |

---

## Template Variables

Available in `message_template` fields (Handlebars syntax):

| Variable | Available in | Description |
|----------|-------------|-------------|
| `{{question}}` | All templates | The full question string passed to `compileSpec()` |
| `{{roundIndex}}` | `flow.rounds.message_template` | 0-based index of the current round |
| `{{outputsByRound}}` | `flow.rounds.message_template`, synthesis | Array of arrays: `outputsByRound[roundIdx][agentIdx].agentName`, `.content` |
| `{{participants}}` | synthesis | Comma-separated list of all round agent names |
| `{{lastOutputByAgent}}` | synthesis `isRevision` path | Object keyed by agent name; `.content` gives their last output |
| `{{conclusion}}` | `flow.audit.message_template` | The synthesis agent's raw output string |
| `{{isRevision}}` | synthesis template | `true` if this is a revision pass after an audit flag |
| `{{auditOutputs}}` | synthesis `isRevision` path | Array of auditor outputs; `auditOutputs.[0].content` |

---

## Two Patterns at a Glance

### Rounds-based (Sparring, Crucible, War Room)

```
agents[] → flow.rounds → flow.synthesis → flow.audit → (revision?) → done
```

- `flow.rounds.agents` debate across N rounds
- `flow.synthesis.agent` commits to a conclusion
- `flow.audit.agents` check the conclusion; if flagged → revision → re-audit (up to `revision.max` times)

### Reviewers-based (Brokered)

```
agents[] → reviewers[] (parallel) → response → done
```

- Each reviewer in `reviewers[]` sees only `{{question}}`
- No cross-visibility between reviewers
- Outputs concatenated or synthesized based on `response.mode`

---

## Loading and Compiling

```ts
import { readFileSync } from 'node:fs'
import { loadSpec, compileSpec } from '@atta/engine'

// 1. Parse + validate YAML
const spec = loadSpec(readFileSync('path/to/spec.yaml', 'utf-8'))

// 2. Compile to a Plan (model override is optional)
const plan = compileSpec(spec, question, model)

// 3. Execute
const conclusion = await adapter.execute({ plan, customVars: {} })
```

`loadSpec()` throws a `SpecValidationError` if the YAML fails schema validation. Errors are thrown at startup in `spec-registry.ts` so malformed specs are caught before any request is served.

---

## YAML Files

All built-in specs live at `apps/vada-ai/yamls/`. New specs go here.

| File | Mode | Agents |
|------|------|--------|
| `sparring-v1.yaml` | rounds (3) | Strategist, Critic + ConclusionSynthesizer + BlindCritic, FactChecker |
| `crucible-v1.yaml` | rounds (3) | 4-agent heavy team |
| `war-room-v1.yaml` | rounds (3) | 6-agent heavyweight |
| `a0-baseline-v1.yaml` | synthesis only | A0 (single-shot naive) |
| `a1-baseline-v1.yaml` | synthesis only | A1 (single-shot structured) |
| `brokered-trio-v1.yaml` | reviewers | Strategist, Critic, Devil's Advocate |
| `brokered-quartet-v1.yaml` | reviewers | 4 reviewers |
