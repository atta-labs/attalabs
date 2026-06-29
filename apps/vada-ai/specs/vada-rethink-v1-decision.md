# Vāda V1 — Belief-Revision Decision Record

**Status:** draft · decision record (out of AEG flow; not a ratified spec)
**Date:** June 29, 2026
**Context:** Resolved V1 architecture following 7-round panel + competitor teardown
(see `vada-rethink.md` for the full research backlog). Principal ratifies on PR merge.

---

## §0 — What this doc is

This doc captures the resolved V1 scope for `vada-production-v1`, distilled from the
brainstorm in `vada-rethink.md`. It is the authority that the 6 re-planned issues
(#179, #180, #182, #183, #186, #188) and the iteration file conform to.

It is NOT a ratified spec. The Principal ratifies on merge.

---

## §1 — Core framing: belief-revision engine, not convergence engine

The signal Vāda surfaces is **how independent models update under criticism** — who
moved, who resisted, who survived — not bare agreement or a consensus score.
"Convergence as truth" is retired.

This reframe changes what Vāda measures, how it names its output, and which product
surfaces carry the weight. The battlefield map (§4) is the primary output artifact.

---

## §2 — Three differentiators

| Differentiator | What it means |
|---|---|
| **Situated** | Lives inside the primary chat via MCP — no manual copy-paste round-trip; Vāda is called, not visited |
| **Trajectory, not verdict** | Output is a battlefield map of positions and revision trajectories, not a winner or score |
| **BYOK + vendor-diversity-as-signal + audit trail** | User brings their own keys; vendor-diverse panel is itself a signal (disagreement surfaces model priors); every step is inspectable (MOAT-A) |

---

## §3 — Two surfaces, one engine

Both surfaces use the same engine (teams, YAML contracts, output shape). Build order: UI first, then MCP.

| Surface | Role | Status |
|---|---|---|
| Web UI | Playground / showroom — renders the battlefield map visually; let users explore outputs | Already built; extend in V1 |
| MCP | Situated product surface — called inside the primary chat; returns structured response | First-class in V1 |

---

## §4 — V1 team set

### 4.1 — Outside Read (`vada__consult`)

**Engine call:** `vada__consult`
**Shape:** `brokered-no-synth` — parallel panel, no cross-talk between reviewers
**Purpose:** External baseline read on any artifact or question

**Three presets (prompt-only differences; same routing flow):**

| Preset | Intent |
|---|---|
| `find-blind-spots` | Surface assumptions and gaps the user's primary reasoning has missed |
| `critique-draft` | Panel critiques a specific draft artifact (proposal, doc, plan) |
| `pre-mortem` | Assume it failed in 12 months — why? (forward-failure analysis) |

> **Pre-mortem is a preset, not a team.** Same `vada__consult` routing, different prompt.
> The panel's own "same flow → not a separate team" rule applies.

**Roles (vendor-diverse + attack-vector composition):**

| Role | Attack vector |
|---|---|
| `assumption-hunter` | Surfaces load-bearing assumptions the user hasn't named |
| `base-rate` | Grounds claims in reference class and historical frequency |
| `failure-mode` | Enumerates failure modes the proposal hasn't addressed |
| `second-order` | Surfaces downstream and second-order consequences |

**Output contract:**

The synthesizer produces a **battlefield map** layered on top of the stored audit trail:

```
{
  "core_agreement": string,          // what every reviewer converged on
  "concessions": string[],           // positions revised under the map
  "irreducible_conflict": string,    // the unresolved core
  "risk_ranking": string | null      // optional: load-bearing risk is X
}
```

The battlefield map renders visually on the web UI and is returned structured from MCP.
`risk_ranking` is an optional pull, never pushed — not a verdict, just the most
load-bearing risk named.

**Audit non-negotiable (MOAT-A):** the map renders ON TOP of the inspectable audit trail.
The trail is never replaced by the map. The map itself runs through the BlindCritic /
FactChecker audit pair — model-written synthesis is the highest verdict-smuggling surface
and must be audited.

---

### 4.2 — Belief Revision (`vada__deliberate`)

**Engine call:** `vada__deliberate`
**Shape:** `rounds-audit` — sequential, position-held, challenges rotate
**Cap:** 2 rounds maximum
**Purpose:** Structured adversarial exchange to surface revision trajectories

**Roles:**

| Role | Function |
|---|---|
| `position-holder` | Holds and defends the thesis across rounds |
| Challengers (rotatable) | Challenge with new objection vectors each round |

**Output contract:**

```
{
  "revision_trajectory": string,      // who moved and how across rounds
  "irreducible_core": string          // what remained unresolved after all rounds
}
```

**Engineering wedge:** The objection-novelty-stop detector is the primary engineering
challenge — not the round cap. The cap (2) is a safety ceiling; the detector is what
makes the rounds team valuable: it stops when objections are repeating, surfacing the
genuinely irresolvable core rather than producing circular exchanges.

---

### 4.3 — Fusion (A2 external benchmark)

`vada-fusion` (real Fusion via OpenRouter) is the **A2 external baseline** — it sits
alongside `a0-baseline` and `a1-baseline` in the benchmark conditions.

**It is NOT a shipped team. It is NOT a first-class team slot in the catalog.** It exists
to answer: "Is our native synthesis discipline better than Fusion's opaque judge on our
own tooling?" That's a benchmark question, not a product slot.

Benchmark conditions:
- `a0-baseline` — single model, no panel
- `a1-baseline` — parallel panel, no synthesis
- `A2` (Fusion) — OpenRouter fusion model (opaque judge, our tooling)
- Other conditions as defined by T9

---

## §5 — Two non-negotiables (cannot be deferred)

1. **The map renders on top of an inspectable audit trail, never replaces it (MOAT-A).** Users must be able to inspect the raw reviewer responses that produced the battlefield map. The map is a convenience layer, not the truth.

2. **The map itself is audited.** BlindCritic + FactChecker run over the synthesizer output. Model-written synthesis is the single highest verdict-smuggling surface in the architecture.

---

## §6 — Deferred (NOT V1)

The following were considered and explicitly cut:

| Deferred | Reason |
|---|---|
| Auto-verification (live fact-check against external sources) | Engineering complexity disproportionate to V1; MOAT-A covers the synthesis surface |
| Post-answer critique lenses (user runs critique after primary chat gives an answer) | Valuable but requires a new situated trigger; not in V1 scope |
| User-facing YAML authoring | Power-user feature; V1 uses preset-based flows only |
| 12-vendor breadth | → ~4 vendors (Anthropic / OpenAI / Google / HF); vendor diversity is signal, not count |
| Open-ended loops | Rounds cap (2) exists for a reason; open-ended introduces unbounded cost; deferred |
| Orthogonal-prompting-as-moat | Evaluated — not a durable moat; cut under competitive review |
| Refinement team | Separate team class; not in V1 |
| Convergence-as-truth framing | Retired entirely — see §1 |
| Four distinct teams as first-class catalog slots | Cut to: Outside Read + Belief Revision (+ Fusion as A2-benchmark only) |

---

## §7 — The only 18-month moat candidate (MOAT-B)

A verticalized instance — Vāda deployed for a specific domain (legal review, medical
pre-mortem, competitive intelligence) — is the only candidate for durable moat beyond
MOAT-A (audit trail). This is a pre-launch gate, not a V1 deliverable. It requires
real usage data to pick the right vertical.

---

## §8 — Process note

This architecture survived:

- 7 rounds of panel deliberation (the pre-mortem preset was the last major addition)
- Competitor teardown: MultipleChat analysis (9 verdict-modes, subscription-arbitrage,
  destination-app model) — their destination-app architecture is the thing to not replicate
- Code-aware review pass

**Cut under review:** convergence-as-truth; open-ended loop; orthogonal-prompting-as-moat;
four-distinct-teams; Fusion-as-team/slot.

**Added under review:** battlefield-map output contract; objection-novelty-stop detector as
the Belief Revision wedge; BlindCritic/FactChecker mandatory audit of the map.
