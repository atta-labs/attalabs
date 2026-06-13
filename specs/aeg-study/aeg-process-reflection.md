# AEG — Process Reflection & Honest Assessment

**Status:** study / living
**Author:** Team Leader (Claude), at the Principal's request — written deliberately *outside* the operating role, as a critic
**Date:** 2026-06-13
**Companion:** `aeg-market-study.md` (the exhaustive competitive landscape)

This document records an honest, enterprise-perspective reflection on the AEG process — specifically prompted by the `herald-onto-engine` planning + briefing session of June 12–13, 2026, which we are deliberately using as a **study object**: to learn, correct, and evaluate whether AEG is a real product or personal infrastructure. It is written to be uncomfortable where discomfort is warranted. The Principal asked for the unflattering version; this is it.

---

## 1. What actually happened in the session (the data)

In one planning+briefing session for a single iteration (`herald-onto-engine`), the process **caught two wrong premises before any code shipped**:

1. **Task 3a** ("add multi-vendor structured output to the engine") was dropped. The Brief Author's code dig found the engine *already* runs all 12 vendors as text (proven by `apps/vada-ai/yamls/brokered-quartet.yaml`), and Herald gets JSON by prompt instruction like Vāda — so the premise ("the engine needs multi-vendor work") was false. #87 closed not-planned.
2. **Task 7** ("auditor gets a GitHub tool") was split into 7a (engine) + 7b (herald). The planner readiness gate's dig (`node-executor.ts` + `graph-state.ts`) found the engine has **no custom client-side tool execution** — only provider-native server tools. So "give Herald a tool" was secretly a shared-engine capability build with Vāda in the blast radius — a `severity:strategy` escalation, not a small Herald task.

Both catches are real value. In a typical team these are the errors discovered three days into implementation, after a developer has half-built the wrong thing.

## 2. The uncomfortable reading of the same data

**The plan was wrong twice in one session.** The catches are the safety net working — but a safety net firing twice means the trapeze is loose. An enterprise reviewer would not say "great, the brief caught it"; they would ask: *why did planning emit tasks whose premises a 20-minute code read demolished?*

The honest answer: **the planner asserted technical facts it had not verified.** We wrote a "readiness gate" into `roles/planner.md` *this same session* — a hard stop requiring the planner to verify all inputs (including reading the relevant code) before emitting tasks — and then **immediately planned 3a and task-7 on unverified premises.** The gate is, today, **aspirational, not load-bearing.** It is documented discipline that the documented disciplinarian did not yet follow.

This is the single most important process lesson of the session: **the "brief sends us back to plan" loop is not a feature to celebrate; it is the symptom of a planning step that signs off before it digs.** The loop-back is cheap *relative to discovering the error in code*, but it is not free, and a mature process pushes the dig *earlier* (into planning) so the loop fires rarely, not twice a session.

### Correction (actionable)
- The planner readiness gate must become **enforced, not trusted**: a plan that emits a task touching a shared package (`@atta/engine`, `@atta/adapter-langgraph`, `@atta/ui`, …) without a recorded code-read of that package's relevant surface is malformed. The gate already says this; the session proves we don't yet *obey* it. Until obeyed, "we have a readiness gate" is a claim the evidence contradicts.
- Track the metric: **count plan-stage premise errors caught at brief-time per iteration.** Two in this iteration. The target is a falling number across iterations. If it doesn't fall, the planning step isn't learning, and the loop-back is masking a defect rather than catching an anomaly.

## 3. The founder-trap signal (stated plainly)

This session spent its entire length building **governance for products (Herald, Studio) that are not yet built.** AEG has more careful thought in it than the products it governs. That ratio should worry the Principal.

The meta-work (the constitution, the contracts, the label vocabulary, the conversational protocol) is more intellectually satisfying than the object-work (shipping Herald's audit onto the engine). So the scaffolding grows beautiful while the building stays empty. This is the classic solo-founder failure mode, and naming it is the point of this document.

**A governance methodology validated on a codebase of two half-built apps run by one person is not evidence the methodology generalizes.** It is evidence that one careful person can run it on their own work. Those are different claims, and enterprises buy the second one.

### Correction (actionable)
- **Freeze AEG-the-model.** It is good enough. The marginal hour on the constitution is now worth less than the marginal hour shipping Herald or Vāda. Stop polishing.
- Let the *use* of AEG over the next iterations vote on its value, not its design elegance.

## 4. What is genuinely good (not false modesty)

The reflection is critical, but three things are real and worth keeping:

1. **The dig discipline works.** When followed, reading the actual code before committing to a plan caught two expensive errors. That is the core mechanism and it earns its place.
2. **Forge-derived status is a genuinely clean idea.** Never storing status, deriving it from branch/PR/merge state, refusing a dynamic conflict scanner — this is coherent and avoids a real class of drift bugs. (Whether it's a *product* is §market-study.)
3. **The conversational protocol** (announce role, name stages, signpost, close out) is a real usability property, not decoration — the Principal repeatedly knew where they were and what was next. Legibility-as-governance is a true idea.

## 5. The Sateliot / brother motivation — and why it matters more than the product question

The Principal named a concrete, non-hypothetical driver: **a pilot at Sateliot, teaching a junior developer (the Principal's brother) who is *scared* to adopt AI** — especially at the team level. This reframes AEG's value in a way the market study must take seriously:

AEG's deepest justification may not be "a better way to run agents" (crowded) or "compliance evidence" (the deadline just moved — see study). It may be **the human-adoption problem**: AEG's manual mode, its visible hand-offs, its "every gate is a checkpoint where a human sees a risk that automation hides" — these are precisely what a *scared* adopter needs. The fear of AI at the team level is fear of *invisible, unaccountable, unreviewable* work. AEG's entire design makes agent work **visible, gated, and reviewable by a human at every seam.**

That is not a compliance pitch or an orchestration pitch. It is a **trust-and-adoption** pitch: *AEG is the on-ramp that lets a team that is afraid of agents adopt them without losing control or visibility.* The "observe mode" (read-only, nothing blocks, monitoring not restriction) is the literalization of this — it is built for exactly the scared adopter.

This is worth more attention than it has had. If AEG has a defensible reason to exist as more than personal infrastructure, **"the governance layer that makes a frightened team comfortable handing work to agents"** is the most honest and least crowded framing — more than "control plane" (Cordum owns that) and more than "spec-driven dev" (Spec Kit owns that). The Sateliot pilot is the real experiment: *does AEG make a scared junior developer, and his team lead, comfortable enough to actually use agents?* That outcome is the product thesis, and it's testable with real humans, not just on the Principal's own repo.

### Correction (actionable)
- Treat the Sateliot pilot as **the primary validation experiment**, above the dogfood. Define success as a human outcome: *does the team lead trust the output? does the junior ship safely? would they keep using it without the Principal in the room?*
- If AEG is ever a product, prototype the pitch as **adoption/trust**, not control or compliance.

## 6. The verdict (this document's recommendation)

- **As personal infrastructure: keep it, freeze it, use it.** Past the point of diminishing returns on design.
- **As a product: do not commit, do not drop — run the experiment.** Use `herald-onto-engine` (does it make shipping real features faster/safer, demonstrably?) and the **Sateliot pilot** (does it make a scared team adopt agents?) as the two votes. Decide on evidence, not attachment.
- **Do not enter the crowded agent-tooling space head-on.** If AEG becomes a product, the least-crowded, most-honest door is **trust/adoption for teams afraid of agents** — with compliance-evidence as a secondary, *now-less-urgent* (deadline deferred) wedge. See the market study for why "control plane" and "spec-driven dev" are already taken.

The fact that the Principal asked "should I just drop it?" after building this much is **healthy, not weak.** The discipline is to let the next two weeks of *actually using it* — on Herald, and with a real scared human at Sateliot — cast the deciding vote.

---

*This is a living study document. Update it after the herald-onto-engine iteration ships and after the Sateliot pilot produces a human outcome. The scorecard (§2 metric; §5 human outcome) is the verdict mechanism — not a feeling.*
