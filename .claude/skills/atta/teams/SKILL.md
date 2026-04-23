---
name: teams-layer
description: Vāda agent and team configurations. Load when adding/modifying agents, teams, reviewer profiles, or building a verticalized team for a specific domain. Covers the tools-on/tools-off invariant. Do NOT load for engine primitives or adapter runtime.
---

# `@atta/teams` — Deliberation Content

## Context

`@atta/teams` holds validated Agent and Team configurations. Pure configuration — system prompts, models, tool declarations, workflow composition. No runtime logic. Agents are immutable configs; teams compose them into deliberations.

This is where MOAT-B (validated corpora) will live when verticalized teams arrive. Currently contains generic Crucible, Sparring (default), and A0/A1 baselines.

---

## Architecture

```
packages/teams/src/
├── agents/
│   ├── strategist.ts              # Reasoning; tools ON
│   ├── critic.ts                  # Reasoning; tools ON
│   ├── devils-advocate.ts         # Reasoning; tools ON
│   ├── synthesizer.ts             # Round integrator; tools ON (classifier hard-rule)
│   ├── conclusion-synthesizer.ts  # Final commit; tools OFF
│   ├── blind-critic.ts            # Logical audit; tools OFF (blindness is the point)
│   ├── fact-checker.ts            # Factual audit; tools ON (verification is the point)
│   ├── a0-solo.ts                 # Naive single-shot baseline
│   └── a1-solo.ts                 # Rich structured-output baseline
├── teams/
│   ├── crucible.ts                # 4-agent heavy team (legacy default, still available)
│   ├── sparring.ts                # 2-agent default team
│   ├── a0.ts                      # A0 baseline team
│   └── a1.ts                      # A1 baseline team
└── index.ts                       # Public exports
```

---

## Tool Assignment Matrix

Critical invariant. Tool assignment follows role, not preference. Breaking this matrix has been empirically shown to degrade output (Task 4.5).

| Agent | Role type | Tools | Why |
|-------|-----------|-------|-----|
| Strategist | Reasoning | ✅ ON | Needs external context to reason |
| Critic | Reasoning | ✅ ON | Needs external context to critique |
| Devil's Advocate | Reasoning | ✅ ON | Needs external context to challenge |
| round-Synthesizer | Integration | ✅ ON | Integrates round claims; verification required. Hard-ruled in router. |
| FactChecker | Verification | ✅ ON | Verification IS the role |
| ConclusionSynthesizer | Commit | ❌ OFF | Commits to round's answer; tools invite re-litigating |
| BlindCritic | Logical audit | ❌ OFF | Blindness is the audit mechanism |
| A0-Solo, A1-Solo | Baseline | ❌ OFF | Single-shot by definition |

If you find yourself wanting to flip any of these, STOP. Surface to Principal.

---

## Agent Definition Pattern

```ts
import type { Agent } from '@atta/engine';

export const strategist: Agent = {
  name: 'Strategist',                         // PascalCase, matches filename
  model: 'claude-sonnet-4-5',
  tools: ['web_search', 'web_fetch'],         // always string[]; [] for tool-off
  systemPrompt: `You are the Strategist. Your role is to...`,
};
```

Conventions:
- `name` is PascalCase and unique; filename matches (kebab-case) e.g. `devils-advocate.ts` exports `devilsAdvocate: Agent` with `name: "Devil's Advocate"`
- `model` is a literal string matching current Anthropic model names
- `tools` is always `string[]`. Use `[]` (not omit) for tool-off agents — explicit intent beats silent default
- `systemPrompt` is role-focused. Round-specific context comes from the adapter at runtime, not the system prompt

---

## Team Definition Pattern

```ts
import type { Team } from '@atta/engine';
import {
  strategist, critic, synthesizer,
  conclusionSynthesizer, blindCritic, factChecker
} from '../agents';

export const sparring: Team = {
  name: 'Sparring',
  agents: [
    strategist, critic, synthesizer,
    conclusionSynthesizer, blindCritic, factChecker
  ],
  workflow: {
    kind: 'rounds',
    agents: ['Strategist', 'Critic'],          // round participants ONLY
    rounds: 3,
    roundSynthesizer: 'Synthesizer',
    conclusionAgent: 'ConclusionSynthesizer',
    auditAgent: ['BlindCritic', 'FactChecker'], // parallel audit
    maxRevisions: 1,
  },
};
```

Conventions:
- `agents` array includes every agent the Team uses (round + synthesizer + conclusion + auditors)
- `workflow.agents` lists only the debate participants (round agents)
- `auditAgent` as array runs auditors in parallel; any flag triggers revision
- `maxRevisions: 1` — one retry slot. Raising this rarely helps and does cost money

---

## Rules

### Follow the Tool Assignment Matrix

Do not deviate without Principal approval. Empirically grounded.

```ts
// ✅
export const blindCritic: Agent = {
  name: 'BlindCritic',
  model: 'claude-sonnet-4-5',
  tools: [],                            // explicit, correct for audit role
  systemPrompt: '...',
};

// ❌ Breaks audit invariant
export const blindCritic: Agent = {
  name: 'BlindCritic',
  tools: ['web_search'],                // contaminates the blind audit
  ...
};
```

### `name` is PascalCase and Unique

`workflow.agents` references agents by name string. Typos = compiler errors thrown by `validate.ts`.

```ts
// ✅
{ name: 'DevilsAdvocate', ... }       // or name: "Devil's Advocate"
workflow: { agents: ['DevilsAdvocate'], ... }

// ❌
{ name: 'devilsAdvocate', ... }       // camelCase; hard to read, inconsistent
```

### Export Agent Instances, Not Factories

Agents are configs, not classes. No builders, no factory functions in V1.

```ts
// ✅
export const critic: Agent = { name: 'Critic', ... };

// ❌ Overkill for V1
export function createCritic(options?: CriticOptions): Agent { ... }
```

### Explicit `tools: []` Over Omission

Makes the tool-off invariant visually obvious in code review.

```ts
// ✅
{ name: 'BlindCritic', tools: [], ... }    // "I intentionally have no tools"

// ❌ Ambiguous
{ name: 'BlindCritic', ... }               // did you forget or intend none?
```

### Don't Share Agent Objects Across Teams Without Copy

Agents are immutable by convention. If one team mutates a shared agent, every team importing it is affected.

```ts
// ✅ Shared immutable import (don't mutate after import)
import { strategist } from '../agents/strategist';

// ❌ Mutating shared agent
import { strategist } from '../agents/strategist';
strategist.model = 'claude-haiku-4-5';      // every team now uses haiku
```

---

## Adding a New Reviewer Profile

For use with `vada__consult` (Brokered mode):

1. Create agent in `agents/<profile-name>.ts` following the Agent pattern
2. Export from `index.ts`
3. Add to `reviewerProfiles` map in `@atta/mcp-server/src/reviewer-profiles.ts`
4. Update `vada__consult` tool description to mention the new profile

---

## Adding a New Team

1. Define or reuse agents in `agents/`
2. Create team file in `teams/<team-name>.ts`
3. Export from `index.ts`
4. Create smoke test `apps/vada-ai/web/scripts/verify-<team>-port.ts` following the pattern of `verify-crucible-port.ts`
5. Run smoke test; confirm transcript length matches expected count
6. Valid terminal states are `CLEAN`, `REVISED`, `MAX_REVISIONS` — all three are success

---

## Building a Verticalized Team (MOAT-B)

Pre-public-launch requirement. Process:

1. Pick domain (Security Architecture, Legal Risk, Medical Deliberation, etc.)
2. Build 100+ validated corpus questions with expected-quality annotations
3. Customize agents for the domain (system prompts, possibly model selection)
4. Benchmark against A0/A1 baselines on the corpus
5. If team beats baselines with statistical significance → ship
6. If not → iterate on prompts, not architecture

---

## A Note on Crucible

Crucible (4-7 agents) is no longer the default team — Sparring (2 agents) is. Round 24 convergence. Crucible stays available as the heavy option for high-stakes multi-perspective decisions.

`verify-crucible-port.ts` is kept as the migration verification script (matches V1 baseline output). Do not remove it.

---

## Anti-patterns

- ❌ Adding `tools: ['web_search']` to BlindCritic (breaks blind-audit invariant)
- ❌ Adding tools to ConclusionSynthesizer (invites re-litigating the round)
- ❌ Generic "be helpful" system prompts (agents need role-forcing prompts)
- ❌ `tools: undefined` (use `[]` for explicit none)
- ❌ Mutating imported agents (shared immutable configs)
- ❌ Creating agent factories / builders (V1 uses plain configs)
- ❌ Making Crucible the default again without Round 24+ evidence
- ❌ Naming mismatch between file and export (filename `strategist.ts` → export `strategist`)

---

## When you need more context

- Why tools-on/tools-off split: **adapter-layer** skill + Task 4.5 rationale
- Agent/Workflow/Team types: **engine-layer** skill
- Reviewer profile usage: **mcp-server-layer** skill
- Pre-launch corpus plan: `apps/vada-ai/specs/vada-product-spec.md` Section 11
