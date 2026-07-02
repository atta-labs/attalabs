# Outside Read — vada-fusion-native

**Spec file:** `packages/agents/vada-deliberation/yamls/vada-fusion-native.yaml`
**Package:** `packages/agents/vada-fusion-native/`
**MCP tool:** `vada__consult` (spec_id: `vada-fusion-native`)
**Status:** draft
**Decision authority:** vada-rethink-v1-decision.md §4.1, §5
**Issue:** #180

---

## What it is

Outside Read is Vāda's primary situated consultation team. It answers the question:
**"What is a vendor-diverse panel of attack-vector reviewers seeing in this, that I am not?"**

Four reviewers examine the user's question in parallel isolation — no cross-talk. A synthesizer distills their outputs into a battlefield map: where they converge, what they concede, what remains irresolvably contested, and the most load-bearing risk. BlindCritic and FactChecker audit the map before it reaches the caller.

---

## Architecture

```
Attack-Vector Panel (4 agents, parallel isolation)
        ↓ each sees {{question}} only
Battlefield Map Synthesis (web-OFF — freshness is in the panel)
        ↓ structured battlefield map
Map Audit (BlindCritic + FactChecker)
        ↓ CLEAN or REVISED map to caller
```

Engine shape: `rounds-audit`. The `brokered-no-synth` product label (from
vada-rethink-v1-decision.md §4.1) refers to the panel's isolation model, not
the engine compiler. `compileBrokeredNoSynth` only processes `flow.rounds[0]`
and cannot compile a 3-phase architecture. `rounds-audit` correctly compiles
all three phases; panel isolation is enforced at the template level
(`message_template: "{{question}}"` on every panel agent).

---

## Roles

| Role | Agent name | Vendor | Attack vector | Visual role (`role:` field) |
|---|---|---|---|---|
| Assumption Hunter | `AssumptionHunter` | Anthropic (claude-sonnet-4-6) | Load-bearing assumptions the user has not named | `devils_advocate` |
| Base Rate | `BaseRate` | Google (gemini-2.5-pro) | Reference class and historical frequency | `researcher` |
| Failure Mode | `FailureMode` | OpenAI (gpt-4o) | Failure modes the proposal has not addressed | `critic` |
| Second Order | `SecondOrder` | xAI (grok-3) | Downstream and second-order consequences | `strategist` ¹ |
| Battlefield Map | `BattlefieldSynthesizer` | Anthropic (claude-sonnet-4-6) | Synthesizer (web-OFF) | `synthesizer` |
| Blind Critic | `BlindCritic` | — | Logical/structural auditor (no tools) | `critic` ² |
| Fact Checker | `FactChecker` | any | Factual auditor (web_search + web_fetch) | `researcher` ² |

All panel agents have `tools: [web_search]` and `classifier.mode: skip` (always-on web access, single-shot advisory, no classifier overhead).

¹ `strategist` confirmed (Principal, Jun 2026): downstream-consequence framing maps to strategic / big-picture reasoning. `operator` considered and rejected.

² Shared roles are intentional design: panel agents and audit agents carrying the same visual role (critic, researcher) are distinguished by agent name, system prompt, and execution phase. The config modal slot label uses the agent name (not the role) so both `FailureMode` and `BlindCritic` are unambiguous to the user despite sharing the critic face. Count badge grouped by role is a follow-up, not built in this iteration.

---

## Battlefield map output contract

```json
{
  "core_agreement": string,        // Non-null. What every reviewer converged on.
  "concessions": string[],         // May be empty. Positions weakened by the panel.
  "irreducible_conflict": string,  // Non-null. What remains genuinely contested.
  "risk_ranking": string | null    // Single most load-bearing risk; null if no clear winner.
}
```

`irreducible_conflict` is non-optional. It is what makes the battlefield map
honest — it names what the panel could NOT resolve, not just what it agreed on.

---

## Three presets

Same YAML, same routing flow. Preset is caller-level context (question framing) —
the caller wraps the user's content in one of these before it reaches
`{{question}}`; there are no separate agents or prompts per preset.

| Preset | Question framing | Effect |
|---|---|---|
| `find-blind-spots` | "Here is my current thinking on this: X. I want to know what I'm not seeing. What load-bearing assumptions, risks, or blind spots am I missing?" | Open-ended — keeps the panel's four attack vectors on their natural default lens. |
| `critique-draft` | "Here is my draft: X. Critique it as an adversarial reviewer would. What are its structural, factual, or logical weaknesses — the kind that would sink it in front of a skeptical stakeholder?" | Adversarial-audience framing — pushes toward weaknesses that surface under scrutiny, not just weaknesses in the abstract. |
| `pre-mortem` | "It is 12 months from now. This plan failed: X. Write the retrospective. Reconstruct exactly how and why it failed, working backward from the failure to the decision points that caused it." | Committed-past-tense framing (prospective hindsight — Klein 1998): treating the failure as certain, not hypothetical, measurably increases the panel's ability to name specific causal chains. |

---

## Audit (non-negotiable)

Model-written synthesis is the highest verdict-smuggling surface. Two auditors
run before the map reaches the caller:

| Auditor | Tools | Fault criterion |
|---|---|---|
| `BlindCritic` | None | Logical/structural defects, phantom consensus (`core_agreement` matching or exceeding a single panelist's own strongest claim), framing bias (map laundering a caller framing — e.g. pre-mortem's hypothetical — into stated fact), unsupported leaps |
| `FactChecker` | `web_search, web_fetch` | Factual errors in verifiable claims, and map claims that cannot be traced back to anything a panelist actually said (ungrounded synthesis, flagged even when incidentally true) |

Both auditors receive the round-0 panel transcript alongside the question and
map (not just the map) — `BlindCritic` to check the map's characterizations
against what the panel actually said, `FactChecker` to verify claims both
externally (web) and against the panel's own outputs. FLAG from either
auditor → synthesizer revises (max 1 revision). Terminal states `CLEAN` and
`REVISED` are both valid delivery states.

---

## MCP invocation

```json
{
  "spec_id": "vada-fusion-native",
  "context": "<background context for the question>",
  "question": "<one of the three preset framings>",
  "reviewers": [
    { "role": "strategist" },
    { "role": "critic" }
  ]
}
```

The `reviewers` field is required by the existing `vada__consult` schema. For
`vada-fusion-native`, role selection fails gracefully (no matching agents in
`ROLE_TO_AGENT_NAME`) and the flow runs with its own default panel agents.

---

## MCP response shape

```json
{
  "responses": [
    { "reviewer": "AssumptionHunter", "response": "..." },
    { "reviewer": "BaseRate", "response": "..." },
    { "reviewer": "FailureMode", "response": "..." },
    { "reviewer": "SecondOrder", "response": "..." },
    { "reviewer": "BattlefieldSynthesizer", "response": "..." },
    { "reviewer": "BlindCritic", "response": "CLEAR ..." },
    { "reviewer": "FactChecker", "response": "CLEAR ..." }
  ],
  "structured": {
    "core_agreement": "...",
    "concessions": ["..."],
    "irreducible_conflict": "...",
    "risk_ranking": "..."
  },
  "terminal_state": "CLEAN",
  "session_id": "...",
  "session_url": "https://vada.attalabs.dev/sessions/...",
  "cost_breakdown": { "estimated_usd": 0.0, "tokens_input": 0, "tokens_output": 0, "duration_ms": 0 }
}
```

---

## Verify script

```bash
# Compile-only (no API key required)
bun run scripts/verify-vada-fusion-native.ts

# End-to-end (API key required)
ANTHROPIC_API_KEY=sk-... bun run scripts/verify-vada-fusion-native.ts --run
```
