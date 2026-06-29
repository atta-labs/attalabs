# Spike: Can Fusion Ship as a Team Within MOAT-A?

**Status:** draft
**Tier:** 0 (findings doc only — no production code)
**Branch:** `spike/fusion-as-team`
**Conforms to:** `vada-rethink-v1-decision.md` §4.3, §5
**Date:** 2026-06-29

---

## The question

Does the `openrouter/fusion` endpoint return the underlying per-model panel responses,
or only its final synthesized answer? Can Fusion ship as a user-facing Vāda team without
violating MOAT-A (the audit-trail invariant)?

---

## §1 — OpenRouter Fusion: what it actually is

OpenRouter Fusion is not a single model. It is a pipeline offered through three distinct
surfaces with different API shapes:

| Surface | Invocation | Response shape |
|---|---|---|
| **Model slug** | `"model": "openrouter/fusion"` | Standard OpenAI-compat: `choices[0].message.content` only |
| **Server Tool** | `"tools": [{ "type": "openrouter:fusion" }]` | `tool_result` containing structured analysis + possibly raw panel responses |
| **Plugin** | `"plugins": [{ "id": "fusion" }]` | Similar to Server Tool |

The current `vada-fusion.yaml` uses the **model slug** surface:

```yaml
defaults:
  model: openrouter/fusion
```

The adapter dispatches this via `callOpenAICompat` → extracts
`response.choices[0]?.message?.content?.trim()`.

---

## §2 — The pipeline (all three surfaces)

Regardless of surface, Fusion runs the same internal pipeline:

1. A panel of OpenRouter-selected models answers the prompt in parallel (with web search + fetch enabled)
2. A judge model reads all panel responses and produces structured analysis:
   `consensus`, `contradictions`, `partial_coverage`, `unique_insights`, `blind_spots`
3. A final model writes the answer grounded in that analysis

The pipeline runs entirely server-side at OpenRouter. No component of steps 1–3 is
user-configurable (panel composition, model selection, judge prompt).

---

## §3 — Response shape: what the caller actually receives

### Model slug (current adapter wiring)

```
response.choices[0].message.content  →  single synthesized answer (string)
```

**No panel outputs. No judge analysis. No structured trace.** The deliberation is fully
internal. From the caller's perspective this is a black box that returns one answer.

The `verify-baselines.ts` script confirms this: it captures `conclusion.content` (the
single string) and nothing else for the A2 condition.

### Server Tool (not currently wired in the adapter)

The `tool_result` contains:
```json
{
  "status": "ok",
  "analysis": {
    "consensus": "...",
    "contradictions": "...",
    "partial_coverage": "...",
    "unique_insights": "...",
    "blind_spots": "..."
  },
  "responses": [
    { "model": "anthropic/claude-opus-4-5", "content": "..." },
    { "model": "openai/gpt-4.1", "content": "..." },
    { "model": "google/gemini-2.5-pro", "content": "..." }
  ]
}
```

On partial panel failure: `status: "ok"` + `failed_models` array.
On judge failure: `status: "ok"` + raw panel responses, `analysis` omitted.
On total failure: `status: "error"` + `failure_reason`.

> **Live call status:** `OPENROUTER_API_KEY` is not set in the current environment.
> The response shape above is derived from OpenRouter's published documentation
> (Fusion Server Tool docs, blog post, third-party API guides). A live-response
> confirmation requires the key. The model-slug shape is also confirmed by the
> existing `verify-baselines.ts` usage pattern — it only captures `conclusion.content`.

---

## §4 — MOAT-A compatibility

MOAT-A requires (§5 of `vada-rethink-v1-decision.md`):
1. The map renders ON TOP of an inspectable audit trail — never replaces it
2. Users can inspect the raw reviewer responses that produced the map

### Model slug: ❌ incompatible

No panel responses surface at all. The user sees one answer from a black box. There is
nothing to render a trail over. MOAT-A is violated at the definition level.

### Server Tool: ⚠️ technically partial, strategically insufficient

The `responses` array contains per-model outputs — Vāda could theoretically surface those
as a "panel transcript." The `analysis` object (Fusion's own structured synthesis) could
be surfaced as a precursor to a Vāda audit pass.

**But MOAT-A's spirit fails on two counts:**

1. **The "trail" is not the raw voices.** The panel responses exist in the `responses` array
   but Fusion's judge has already curated them into the `analysis` structure before returning
   them. What the user would inspect is Fusion's extraction of the panel, not the panel
   itself speaking unmediated. Compare: in Vāda's own Outside Read, users read verbatim
   AssumptionHunter/BaseRate/FailureMode/SecondOrder outputs before the BattlefieldSynthesizer
   touches them. The trail is unprocessed voices, not a judge's summary of those voices.

2. **BYOK is broken.** The panel composition (which models, what prompts, what tools) is
   OpenRouter-determined and non-configurable. Vāda's BYOK principle requires the user to
   control the models doing the deliberation. With Fusion, the panel is opaque and locked.

**Can BlindCritic/FactChecker audit Fusion's output?** Yes — they could audit Fusion's
final answer the same way they audit BattlefieldSynthesizer's output. But what they'd be
auditing is a synthesis of a synthesis. The panel voices that produced Fusion's `analysis`
are one indirection removed from the audit. This is not the same audit chain as
`panel → BattlefieldSynthesizer → BlindCritic/FactChecker`.

---

## §5 — The three product shapes

### (a) Fusion as raw guest team — no Vāda audit layer

**What it is:** `vada-fusion.yaml` added to the catalog as a published team. Users select
it from the team picker. They get Fusion's answer. No Vāda processing on top.

**Engineering cost:** Zero (already wired as a YAML; just un-set `experimental: true`).

**MOAT-A cost:** Full violation. No trail. Users see one answer from a black box. Vāda
becomes a launcher for an opaque pipeline.

**Strategic cost:** High. This is the MultipleChat trap precisely — Vāda becomes a
destination app that surfaces another service's opaque output. The §8 lesson applies
directly: "their destination-app architecture is the thing to not replicate."

**Verdict:** Do not ship. Violates MOAT-A. Contradicts the core differentiator (§2:
"Trajectory, not verdict").

---

### (b) Fusion wrapped — Vāda's audit/map layer on top

**What it is:** Use the Fusion Server Tool (not the model slug) to get the structured
`analysis` + `responses` array; surface the `responses` as a panel transcript; run
BlindCritic/FactChecker over Fusion's analysis; render a Vāda battlefield map.

**Engineering cost:** Non-trivial:
- Adapter needs a new branch: instead of `choices[0].message.content`, parse `tool_result`
  from the Fusion Server Tool response
- The YAML schema has no concept of "external engine" teams that don't use Vāda-managed
  agents — a new flow shape would be needed
- Fusion's `analysis` fields (consensus/contradictions/partial_coverage/unique_insights/
  blind_spots) don't map cleanly to Vāda's `outputsByRound`/BattlefieldSynthesizer output
  contract (core_agreement/concessions/irreducible_conflict/risk_ranking)
- UI rendering of "external panel + Vāda audit" is a new surface not currently built
- Estimate: 3–5 engineering days to build correctly, with significant architectural debt

**MOAT-A cost:** Partial. The `responses` array surfaces panel voices — better than the
model slug. But the BYOK violation remains (OpenRouter chooses the panel models). And the
"trail" the user inspects is Fusion-controlled, not Vāda-controlled. The audit pair
operates one level removed from the actual deliberation.

**Strategic assessment:** This is the "universal client" thesis in its most literal form.
But it has a fundamental tension: Vāda's audit value comes from auditing deliberation that
Vāda controls end-to-end. Auditing someone else's pipeline makes Vāda a meta-auditor of
an opaque engine. That's not what MOAT-A is.

The defensible form of the universal client thesis is: third-party teams authored as Vāda
YAMLs, run by Vāda's engine, with user-configured models (BYOK). Fusion-as-guest-team is
the opposite: fixed-composition, externally-run, results imported after the fact.

**Verdict:** Technically achievable but strategically confusing. Engineering cost is
real; MOAT-A is only partially satisfied; the "Vāda adds a layer" claim becomes
difficult to defend when the underlying deliberation is a black box.

---

### (c) Fusion stays benchmark-only — current §4.3 decision

**What it is:** `vada-fusion.yaml` remains as-is: `experimental: true`, visible only to
the benchmark harness (`verify-baselines.ts`). It answers the question "does our native
synthesis discipline beat Fusion's opaque judge on our own tooling?" Benchmark question,
not a product question.

**Engineering cost:** Zero.

**MOAT-A cost:** Zero. No catalog exposure; no user-facing trail claim.

**Strategic value:** Preserved. A2 benchmark condition gives a real external comparison
point. When Vāda's own Outside Read team beats Fusion's opaque judge on judge-scored
benchmark questions, that's a concrete capability claim.

**Verdict:** The correct call. §4.3 holds.

---

## §6 — Strategic framing: universal client vs. the MultipleChat trap

Dani's thesis: "Vāda = universal client for best deliberation engines, adding audit/
trajectory layer on top."

The tension: does "universal client" mean (a) wrapping any external engine's output, or
(b) any engine that speaks Vāda's protocol (YAML spec, inspectable rounds, BYOK)?

The MultipleChat teardown (§8) reveals the trap: destination-app architecture. MultipleChat
surfaced multiple models' outputs without adding a layer of its own — the user saw a menu
of answers. Fusion-as-raw-guest-team (shape a) is identical in spirit.

Shape (b) partially escapes the trap — Vāda does add its audit layer. But it audits
externally-controlled deliberation, which creates a different trap: Vāda's quality
guarantee is only as good as Fusion's opacity. If Fusion's panel composition changes,
Vāda's audit output changes with it, without Vāda knowing why.

The defensible "universal client" path is narrower and more coherent:

> Vāda is a universal client for **YAML-authored deliberation specs** — any team expressed
> as a Vāda YAML (with Vāda-controlled agents, user-configured models, BYOK) gets Vāda's
> full audit/trajectory layer. Third parties can author YAMLs; Vāda remains the engine.

This framing makes Fusion **a comparison point**, not a guest engine. Fusion answers
"how does Vāda compare to the best external alternative?" — which is exactly the A2
benchmark role. That's a competitive positioning function, not a product slot.

---

## §7 — Recommendation

**Ship nothing. §4.3 holds.**

- Shape (a): MOAT-A violation. Ruled out.
- Shape (b): Partially compatible, but engineering cost is real, MOAT-A is only partially
  satisfied, and the strategic signal is confusing. Not worth V1 scope.
- Shape (c): The correct call. Fusion's benchmark role (A2 external baseline) is
  strategically valuable. It anchors the capability claim when Vāda's native teams win.

**One flag for Principal:**

The Server Tool surface (shape b) is not permanently closed. If, after MOAT-A ships and
Vāda's own teams have benchmark data, there is user demand for a "compare to Fusion"
feature, the wrapping approach becomes more defensible as a research/comparison mode
(not a catalog team). That conversation belongs after V1.

**Live call confirmation needed:**

This spike did not make a live Fusion API call. `OPENROUTER_API_KEY` was not available.
The response shape analysis is based on OpenRouter's published documentation and the
existing adapter code. To confirm the model-slug response shape empirically: set
`OPENROUTER_API_KEY` and run `bun run scripts/verify-baselines.ts` from
`apps/vada-ai/web/` — the A2 condition will execute and log `conclusion.content` (the
opaque single answer). To inspect the Server Tool response shape, a separate test script
would need to invoke the OpenAI SDK with `tools: [{ type: "openrouter:fusion" }]` and
log the full raw response.

---

## §8 — Summary table

| Shape | MOAT-A | BYOK | Engineering | Strategic verdict |
|---|---|---|---|---|
| (a) Raw guest team | ❌ violated | ❌ broken | ~0 days | Do not ship |
| (b) Fusion wrapped (Server Tool) | ⚠️ partial | ❌ broken | 3–5 days | Defer past V1 |
| (c) Benchmark-only (§4.3) | ✅ intact | ✅ intact | 0 days | **Confirmed correct** |
