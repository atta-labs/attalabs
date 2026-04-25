---
name: atta-teams
description: Vāda agent and team configurations. Load when adding/modifying agents, teams, reviewer profiles, or building a verticalized team for a specific domain. Covers the tools-on/tools-off invariant. Do NOT load for engine primitives or adapter runtime.
---

# `@vada/agents` + YAML Specs — Deliberation Content

## Context

Deliberation content is split across two concerns:

- **`@vada/agents`** (`apps/vada-ai/agents/`) — agent definitions with display metadata (`VadaAgentDef`). Pure config — system prompts, tool lists, UI colors, face indices. Still used directly by `consult.ts` for the Brokered tool.
- **YAML spec files** (`apps/vada-ai/yamls/`) — deliberation configs that compose agents into workflows. These replaced the deleted `@vada/teams` TypeScript package. All seven built-in specs live here as YAML files.

No runtime logic lives in either location. Agents are immutable configs; YAML specs compose them into deliberations.

`@vada/teams` is **deleted**. Do not reference or import it.

---

## Architecture

```
apps/vada-ai/agents/src/
├── agents/
│   ├── strategist.ts              # Reasoning; tools ON
│   ├── critic.ts                  # Reasoning; tools ON
│   ├── devils-advocate.ts         # Reasoning; tools ON
│   ├── synthesizer.ts             # Round integrator; tools ON (always_tools in YAML)
│   ├── researcher.ts              # Evidence grounding; tools ON
│   ├── operator.ts                # Execution feasibility; tools OFF
│   ├── conclusion-synthesizer.ts  # Final commit; tools OFF
│   ├── blind-critic.ts            # Logical audit; tools OFF (blindness is the point)
│   ├── fact-checker.ts            # Factual audit; tools ON (verification is the point)
│   ├── a0-solo.ts                 # Naive single-shot baseline
│   └── a1-solo.ts                 # Rich structured-output baseline
├── types.ts                       # VadaAgentDef, AgentName
└── index.ts                       # Public exports

apps/vada-ai/yamls/
├── sparring-v1.yaml               # 2-agent default (Strategist + Critic, 3 rounds)
├── crucible-v1.yaml               # 4-agent heavy team
├── war-room-v1.yaml               # 6-agent heavyweight
├── a0-baseline-v1.yaml            # Single-agent naive baseline
├── a1-baseline-v1.yaml            # Single-agent structured-output baseline
├── brokered-trio-v1.yaml          # 3 reviewers, no rounds (Strategist + Critic + Devil's Advocate)
└── brokered-quartet-v1.yaml       # 4 reviewers, no rounds
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

Agents in `@vada/agents` are still used directly by `consult.ts`. The pattern is unchanged.

```ts
import type { VadaAgentDef } from '../types'

export const strategist = {
  name: 'Strategist',                         // PascalCase, matches filename
  role: 'strategist',                         // kebab-free slug used by web app
  displayName: 'The Strategist',
  tagline: 'Maps the landscape',
  color: 'var(--agent-strategist)',
  faceIndex: 0,
  description: '...',
  tools: ['web_search', 'web_fetch'],         // always string[]; [] for tool-off
  systemPrompt: `You are the Strategist. Your role is to...`,
} satisfies VadaAgentDef
```

Conventions:
- `name` is PascalCase and unique; filename matches (kebab-case) e.g. `devils-advocate.ts` exports `devilsAdvocate` with `name: "Devil's Advocate"`
- `satisfies VadaAgentDef` instead of explicit type — preserves literal types
- `tools` is always `string[]`. Use `[]` (not omit) for tool-off agents — explicit intent beats silent default
- `systemPrompt` is role-focused. Round-specific context comes from the adapter at runtime, not the system prompt

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

`apps/vada-ai/mcp-server/src/spec-registry.ts` loads all 7 YAMLs at startup:

```ts
import { lookupSpec, listPublicSpecs } from './spec-registry'

// By full spec ID
const spec = lookupSpec('sparring-v1')

// By short alias (MCP-facing names)
const spec = lookupSpec('sparring')    // → sparring-v1

// All non-experimental specs
const specs = listPublicSpecs()
```

ALIASES map in spec-registry.ts: `sparring`, `crucible`, `war-room`, `a0`, `a1`.

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

1. Create `apps/vada-ai/yamls/<team-name>-v1.yaml`
2. Define agents inline in the YAML (or reference existing `@vada/agents` names for brokered)
3. Add to `SPECS` record in `apps/vada-ai/mcp-server/src/spec-registry.ts`
4. Add short-name ALIAS if exposing via MCP tool
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
- ❌ Defining team logic in TypeScript instead of YAML
- ❌ Adding `tools: ['web_search']` to BlindCritic (breaks blind-audit invariant)
- ❌ Adding tools to ConclusionSynthesizer (invites re-litigating the round)
- ❌ Generic "be helpful" system prompts (agents need role-forcing prompts)
- ❌ `tools: undefined` (use `[]` for explicit none)
- ❌ Mutating imported agents (shared immutable configs)
- ❌ Creating agent factories / builders (plain configs only)
- ❌ Making Crucible the default again without Round 24+ evidence
- ❌ Agent name mismatch between YAML flow references and agent definition

---

## When you need more context

- Why tools-on/tools-off split: **atta-adapter-langgraph** skill + Task 4.5 rationale
- Agent/Workflow/Team types: **atta-engine** skill
- YAML schema reference: `apps/vada-ai/specs/yaml-schema-reference.md`
- YAML authoring: **vada-yaml-authoring** skill
- Brokered mode concepts: **vada-brokered** skill
- Pre-launch corpus plan: `apps/vada-ai/specs/vada-product-spec.md` Section 11
