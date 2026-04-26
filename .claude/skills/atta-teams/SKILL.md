---
name: atta-teams
description: Vāda agent and team configurations. Load when adding/modifying agents, teams, reviewer profiles, or building a verticalized team for a specific domain. Covers the tools-on/tools-off invariant. Do NOT load for engine primitives or adapter runtime.
---

# YAML Specs + Agent Visuals — Deliberation Content

## Context

Deliberation content is split across two concerns:

- **YAML spec files** (`apps/vada-ai/yamls/`) — deliberation configs that define agents and workflows. These replaced the deleted `@vada/teams` TypeScript package. All seven built-in specs live here as YAML files. Agent system prompts, tool configs, and flow structure are all in YAML.
- **Agent visuals** (`apps/vada-ai/web/src/components/agents/visuals/`) — display-only metadata for web UI rendering (colors, face indices, display names). No runtime deliberation logic. Used only by the web app.

No runtime logic lives in either location. YAML specs compose agents into deliberations; visuals directory provides UI-only rendering config.

`@vada/teams` is **deleted**. Do not reference or import it.
`@vada/agents` / `@vada/agent-metadata` are **deleted**. Do not reference or import them. See [apps/vada-ai/web/src/components/agents/visuals/](../apps/vada-ai/web/src/components/agents/visuals/) for web-only display types.

---

## Architecture

```
apps/vada-ai/web/src/components/agents/visuals/
└── index.ts                       # VadaAgentVisual type + per-agent display configs (web-only)

apps/vada-ai/yamls/
├── sparring.yaml                  # 2-agent default (Strategist + Critic, 3 rounds)
├── crucible.yaml                  # 4-agent heavy team
├── war-room.yaml                  # 6-agent heavyweight
├── a0-baseline.yaml               # Single-agent naive baseline
├── a1-baseline.yaml               # Single-agent structured-output baseline
├── brokered-trio.yaml             # 3 reviewers, no rounds (Strategist + Critic + Devil's Advocate)
└── brokered-quartet.yaml          # 4 reviewers, no rounds (experimental)
```

---

## Tool Assignment Matrix

Critical invariant. Tool assignment follows role, not preference. Breaking this matrix has been empirically shown to degrade output (Task 4.5). In YAML, this is controlled via `classifier.mode` per agent.

| Agent | Role type | Tools | classifier.mode | Why |
|-------|-----------|-------|-----------------|-----|
| Strategist | Reasoning | ON | `auto` | Needs external context to reason |
| Critic | Reasoning | ON | `auto` | Needs external context to critique |
| Devil's Advocate | Reasoning | ON | `auto` | Needs external context to challenge |
| round-Synthesizer | Integration | ON | `always_tools` | Integrates round claims; verification required. always_tools replaces the old name-substring hard rule. |
| FactChecker | Verification | ON | `auto` | Verification IS the role |
| ConclusionSynthesizer | Commit | OFF | `skip` | Commits to round's answer; tools invite re-litigating |
| BlindCritic | Logical audit | OFF | `skip` | Blindness is the audit mechanism |
| A0-Solo, A1-Solo | Baseline | OFF | `skip` | Single-shot by definition |
| Brokered reviewers | Advisory | OFF | `skip` | Single-shot, no rounds |

If you find yourself wanting to flip any of these, STOP. Surface to Principal.

---

## Agent Definition Pattern

Agents are defined directly in YAML specs. The `@vada/agents` package is deleted — do not reference it.

For `consult.ts` (Brokered mode), reviewer personas are defined inline as `DeliberationSpec` objects built at call time. No separate agent config files.

For web UI display (colors, face indices), see `apps/vada-ai/web/src/components/agents/visuals/`.

---

## YAML Spec Structure

A YAML spec defines a complete deliberation. Two modes:

**Rounds mode** (autonomous deliberation — sparring, crucible, war-room, baselines):
```yaml
schema_version: "1.0"
id: sparring-v1
display_name: Sparring
description: Two-agent debate across three rounds with dual audit and revision.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: Strategist
    description: Maps the landscape...
    tools: [web_search, web_fetch]
    classifier:
      mode: auto
    system_prompt: |
      You are the Strategist...

flow:
  rounds:
    count: 3
    agents: [Strategist, Critic]
    message_template: |
      {{question}}
      ...
  synthesis:
    agent: ConclusionSynthesizer
    message_template: |
      ...
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

**Reviewers mode** (brokered — parallel independent advisors, no rounds):
```yaml
schema_version: "1.0"
id: brokered-trio-v1
display_name: Brokered Trio
description: Three independent advisory reviewers.

defaults:
  model: claude-sonnet-4-6

agents:
  - name: Strategist
    classifier:
      mode: skip           # no classifier, single-shot
    system_prompt: |
      ...

reviewers:
  - agent: Strategist
    message_template: "{{question}}"
  - agent: Critic
    message_template: "{{question}}"
  - agent: "Devil's Advocate"
    message_template: "{{question}}"

response:
  mode: concatenate
  format: "## {agent_name}\n\n{content}\n\n---\n\n"
```

Full schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`

---

## Spec Registry

`apps/vada-ai/mcp-server/src/spec-registry.ts` provides dynamic access to the YAML catalog via `@atta/engine`:

```ts
import { lookupSpec, listPublicSpecs } from './spec-registry'

// By full spec ID (auto-discovered from apps/vada-ai/yamls/)
const spec = lookupSpec('sparring')
const spec = lookupSpec('crucible')

// By short alias (explicit ALIASES — a0, a1 only)
const spec = lookupSpec('a0')    // → a0-baseline
const spec = lookupSpec('a1')    // → a1-baseline

// All non-experimental specs
const specs = listPublicSpecs()
```

ALIASES map: `a0` → `a0-baseline`, `a1` → `a1-baseline`. No other aliases.

---

## Rules

### Follow the Tool Assignment Matrix

Do not deviate without Principal approval. Empirically grounded.

```ts
// ✅ In YAML: audit agent, no tools, skip classifier
- name: BlindCritic
  classifier:
    mode: skip
  system_prompt: ...

// ❌ Breaks audit invariant
- name: BlindCritic
  tools: [web_search]    # contaminates the blind audit
```

### `name` is PascalCase and Unique

Agent names in YAML `flow.rounds.agents`, `flow.audit.agents`, `flow.synthesis.agent`, and `reviewers[].agent` must exactly match the `name` field in the corresponding agent definition. Mismatches fail at `loadSpec()` or `compileSpec()`.

```yaml
# ✅
agents:
  - name: ConclusionSynthesizer
flow:
  synthesis:
    agent: ConclusionSynthesizer   # exact match

# ❌
flow:
  synthesis:
    agent: Conclusion-Synthesizer  # mismatch → runtime error
```

### Export Agent Instances, Not Factories

Agents in `@vada/agents` are configs, not classes. No builders, no factory functions.

```ts
// ✅
export const critic = { name: 'Critic', ... } satisfies VadaAgentDef;

// ❌
export function createCritic(options?: CriticOptions): VadaAgentDef { ... }
```

### Explicit `tools: []` Over Omission

Makes the tool-off invariant visually obvious in `@vada/agents` code review.

```ts
// ✅
{ name: 'BlindCritic', tools: [], ... }    // "I intentionally have no tools"

// ❌ Ambiguous
{ name: 'BlindCritic', ... }               // did you forget or intend none?
```

---

## Adding a New Reviewer Profile

For use with `vada__consult` (Brokered mode):

1. Create agent in `apps/vada-ai/agents/src/agents/<profile-name>.ts` following the Agent pattern
2. Export from `apps/vada-ai/agents/src/index.ts`
3. Add to `reviewerProfiles` map in `apps/vada-ai/mcp-server/src/tools/consult.ts`
4. Update `vada__consult` tool description to mention the new profile

---

## Adding a New Team (YAML spec)

1. Create `apps/vada-ai/yamls/<team-name>.yaml` (no `-v1` suffix — see D-025)
2. Define agents inline in the YAML
3. The spec is **auto-discovered** — no changes to `spec-registry.ts` needed
4. Add to ALIASES map only if a short-name is needed for MCP UX
5. Create verify script `apps/vada-ai/web/scripts/verify-<team-name>-port.ts` following `verify-sparring-port.ts`
6. Run verify script; confirm transcript length matches expected count

Valid terminal states: `CLEAN`, `REVISED`, `MAX_REVISIONS` — all three are success.

See also: **vada-yaml-authoring** skill for detailed YAML authoring guidance.

---

## Building a Verticalized Team (MOAT-B)

Pre-public-launch requirement. Process:

1. Pick domain (Security Architecture, Legal Risk, Medical Deliberation, etc.)
2. Build 100+ validated corpus questions with expected-quality annotations
3. Create YAML spec with domain-customized agent system prompts
4. Benchmark against A0/A1 baselines on the corpus
5. If team beats baselines with statistical significance → ship
6. If not → iterate on prompts, not architecture

---

## A Note on Crucible

Crucible (4-7 agents) is no longer the default team — Sparring (2 agents) is. Round 24 convergence. Crucible stays available as the heavy option for high-stakes multi-perspective decisions.

`verify-crucible-port.ts` is kept as the migration verification script. Do not remove it.

---

## Anti-patterns

- ❌ Importing from `@vada/teams` — that package is deleted
- ❌ Importing from `@vada/agents` or `@vada/agent-metadata` — those packages are deleted
- ❌ Defining team logic in TypeScript instead of YAML
- ❌ Adding `tools: ['web_search']` to BlindCritic (breaks blind-audit invariant)
- ❌ Adding tools to ConclusionSynthesizer (invites re-litigating the round)
- ❌ Generic "be helpful" system prompts (agents need role-forcing prompts)
- ❌ `tools: undefined` in YAML (use `[]` for explicit none)
- ❌ Making Crucible the default again without Round 24+ evidence
- ❌ Agent name mismatch between YAML flow references and agent definition
- ❌ Adding `-v1` suffix to new YAML filenames before a fork exists (see D-025)

---

## When you need more context

- Why tools-on/tools-off split: **atta-adapter-langgraph** skill + Task 4.5 rationale
- Agent/Workflow/Team types: **atta-engine** skill
- YAML schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`
- YAML authoring: **vada-yaml-authoring** skill
- Brokered mode concepts: **vada-brokered** skill
- Pre-launch corpus plan: `apps/vada-ai/specs/vada-product-spec.md` Section 11
