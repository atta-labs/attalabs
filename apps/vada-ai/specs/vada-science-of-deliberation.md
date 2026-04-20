# Vāda · The Science of Deliberation

**Theoretical Foundations, Implementation Discoveries, and Current Evidence**
Version 3 — April 2026

---

## Introduction

This document describes the theoretical foundations on which Vāda's architecture is built, the implementation discoveries that emerged during construction, and the current state of empirical validation.

It is intentionally structured to separate three layers:
- **Theory** — what frameworks suggest should work
- **Implementation** — what we discovered while building
- **Evidence** — what we have actually measured

The third layer is under-developed at the time of this writing. Vāda V1 shipped in April 2026 with its first bench results producing a 7/7 diagnostic split against single-shot baseline. The theory predicts Vāda should beat single-shot; the evidence does not yet confirm this broadly. V2 research addresses the gap.

**Readers should treat claims in Parts 1-3 as theoretical grounding, and claims in Part 4 as hypotheses not yet fully tested.**

---

## Part 1: Theoretical Foundations

Vāda's architecture is mapped to four established frameworks for how groups produce better decisions than individuals. These frameworks were developed independently across philosophy, psychology, management science, and military intelligence. The fact that they converge on similar structural requirements — role separation, adversarial tension, forced synthesis — suggests the design direction is sound.

### 1.1 The Hegelian Dialectic

**Origin:** Georg Wilhelm Friedrich Hegel, 19th century. A method of arriving at truth through the collision of opposing ideas.

**Thesis:** The Strategist's map. **Antithesis:** The Critic's attack. **Synthesis:** The Synthesizer's conclusion — not a compromise, but a new understanding that incorporates what survived the collision.

Vāda's three-round structure is a direct implementation of the dialectic. Round 1 is thesis (positions stated). Round 2 is antithesis (positions collide). Round 3 is synthesis (convergence or clarified disagreement).

### 1.2 Edward de Bono's Six Thinking Hats

**Origin:** Edward de Bono, 1985. A psychological tool for preventing groupthink by forcing participants into singular, parallel modes of thinking.

De Bono's insight: when people wear all hats simultaneously, they default to Black (criticism) and Green (creativity), ignoring White (facts) and Yellow (value). Cognitive Quarantine is the technical implementation of hat separation.

### 1.3 Belbin Team Roles

**Origin:** Meredith Belbin, 1970s. Research proving that successful teams require a balance of action-oriented, people-oriented, and cerebral roles.

Vāda's Synthesizer maps to Coordinator. Operator maps to Implementer and Completer-Finisher. Critic maps to Monitor-Evaluator. Strategist contains elements of Plant (creative) and Shaper (driving).

### 1.4 Military Red Teaming

**Origin:** U.S. intelligence and military planning practice. An independent group attacks an organization's strategy to discover vulnerabilities before execution.

The Devil's Advocate is Vāda's red team. Its job is not to find flaws in the plan — that is the Critic's job. Its job is to reject the frame entirely: to ask whether the question itself is the wrong question. Red teams catch premise failures that internal review misses.

---

## Part 2: The Physics of Multi-Agent Deliberation

### 2.1 Persona Collapse

When you ask a single LLM to simulate a debate, it suffers from an inherent drive toward mathematical consensus. The model's architecture predicts the most likely next token that resolves the prompt.

If you tell one model to be both the Strategist and the Critic, the Critic will subconsciously pull its punches because the model already knows where the Strategist's argument is going. Within approximately 2,000 tokens, the personas bleed together.

This is not a prompt engineering failure. It is a structural property of how language models generate text.

### 2.2 Cognitive Quarantine

Vāda's proposed solution is structural, not instructional. Each agent runs as a completely separate LLM instance with its own system prompt. The Critic's only directive is to destroy the Strategist's logic. It does not know how the Synthesizer will resolve the tension.

This substitutes the LLM's internal probability smoothing with hard, enforceable boundaries. The theoretical result is genuine surprise — moments where an agent says something that no single model would produce.

**Current evidence:** Cognitive Quarantine appears to work at the agent-turn level (V1 bench shows agents maintaining distinct perspectives across rounds). However, V1 bench also revealed that the Synthesizer's compression of deliberation output can erase some of the diversity that Quarantine produced. Post-deliberation compression is a separate problem from prompt-level persona separation.

### 2.3 The Geometry of the Three Rounds

A single AI generation is linear. Vāda's three rounds are geometric, designed to produce what a single AI cannot easily create: genuine surprise.

**Round 1 (Orthogonal):** Everyone looks independently at the question. No contamination.
**Round 2 (Adversarial):** The agents look at each other. This is where the product theoretically lives.
**Round 3 (Converging):** Agents react to Round 2's friction, culminating in the Synthesizer drawing the borders of remaining disagreement.

### 2.4 Context Depth vs. Context Freshness

**Context depth** is what an agent has when it has been "in the room" for all rounds. The Synthesizer works because it has context depth.

**Context freshness** is what an agent has when it encounters something for the first time. The Blind Critic works because it has context freshness — it evaluates the conclusion without the deliberation's gravitational pull.

Both are necessary. Neither is sufficient.

### 2.5 Architectural Cognitive Diversity

Cognitive Quarantine solves Persona Collapse at the prompt level. But a second-order problem remains: even with structurally separated agents, if every agent runs on the same foundational neural network, the agents share a deeper consensus — the consensus of a single model architecture's biases, training distribution, and alignment tuning.

A single model has a characteristic signature. Claude Sonnet produces structured, cautious, schema-compliant output. GPT-4o produces expansive, systemic, exploratory output. Llama 3 produces more direct, less hedged, more contrarian output. These are not quirks — they are architectural properties of how each model was trained.

**Architectural Cognitive Diversity** is the principle that assigning different foundational models to different Vāda agents creates adversarial friction at the model-architecture level, not just at the prompt level.

### Why V1 is Single-Model

Despite the theoretical promise, V1 ships with Sonnet locked for all agents. The reason is practical:

1. The Conclusion Protocol depends on strict JSON schema compliance. Different providers handle schema enforcement differently. Mixing models at the Synthesizer or Blind Critic layer introduces malformed JSON, missing fields, and inconsistent escape handling.

2. V1 must ship with a stable conclusion pipeline. Model diversity experiments require working infrastructure.

Multi-model deliberation is a V2 research target (Phase 3 of the V2 specification).

---

## Part 3: Implementation Discoveries

These are problems discovered during actual implementation — not predicted by theory. They are the gap between design and reality.

### 3.1 The Anti-Amnesia Protocol

**Problem:** Context Drift. In multi-round deliberations, agents tend to drift. They respond to each other and forget the original constraints from the Principal.

**Layer A: The Universal Anchor**

Vāda appends a Critical Reminder block at the very end of every prompt, every turn. LLMs have a recency bias — the last text in the prompt has disproportionate influence on output. Without this anchor, agents drift from constraints within 2-3 rounds.

**Layer B: The Meta-Debate Killswitch**

**Problem:** Contrarian agents waste turns arguing that a question is poorly defined rather than engaging with it.

**Solution:** Postures explicitly forbid meta-debates. Agents must participate in the exercise even if they disagree with the framing.

**Layer C: The Blind Audit Loop**

The Blind Critic sees only the original question and the final JSON — never the deliberation transcript. If the Critic saw the transcript, it might forgive a mistake because it understood the context. By making it blind, the system forces evaluation strictly against the Principal's requirements.

### 3.2 The JSON Paradox

**Problem:** When the Principal requests a specific format, the Synthesizer must produce formatted text inside a JSON structure. Raw newlines inside JSON strings break the parser.

**Solution:**
- Formatting rules apply only to the `recommendation` string inside the JSON.
- The Synthesizer uses `\n` (escaped newlines) for line breaks within the recommendation string.
- RULE 0 was added to the Blind Critic: do not flag the output for being JSON. Evaluate formatting only against the `recommendation` field's text.

### 3.3 The Forgiving Audit Pattern

**Problem:** Smaller models often add conversational filler — "Here is your result: PASS". Exact string matching fails.

**Solution:** The Blind Critic's parser looks for `PASS` anywhere in the response (substring match), and `FLAG:` similarly.

### 3.4 Small-Model Posture Adherence Ceiling

**Problem (discovered during April 2026 cross-model testing):** Qwen 2.5 14B does not reliably maintain distinct agent personas under Vāda's posture system prompts. Output defaults to generic advisory voice regardless of role (Strategist, Critic, etc.). Claude Sonnet 4.6 maintains personas clearly.

**Implication:** Vāda's architecture requires a model capability floor. Below that floor, Cognitive Quarantine fails at the persona-maintenance level, regardless of prompt engineering. Current V1 guidance: Claude Sonnet, GPT-4-class, or Llama 70B+ minimum.

### 3.5 The Synthesizer Over-Compression Problem (April 21, 2026)

**Problem discovered in V1 bench:** When the Synthesizer produces the final conclusion from deliberation transcripts, it compresses useful content out of the recommendation. Specifically: conditional branches, stress-test warnings, practical caveats, and decision-support heuristics present in the Round 3 transcript get stripped when the Synthesizer writes the single-string `recommendation` field.

**Judge analysis evidence:**
- *"Deliberation tightened the prose and provided a cleaner verdict, but removed critical stress-test content"*
- *"Compressed away the unplanned work/capacity reservation heuristic"*
- *"Sacrificed important practical warnings"*

**Implication:** The current Conclusion schema (single `recommendation` string) forces compression. The Synthesizer prompt biases toward decisive brevity. Together they erase much of the deliberation's value.

**V2 response:** Experiment 1.A refines the Synthesizer prompt to preserve conditional structure. Experiment 1.B (if needed) extends the Conclusion schema to allow richer structured output. See `vada-v2-specification.md`.

---

## Part 4: Current Evidence

This section is distinct from Parts 1-3. It describes what has been measured, not what theory predicts.

### 4.1 V1 Bench (April 21, 2026)

**Run:** 14 completed questions + 1 resume-skipped. Claude Sonnet 4.6 for Vāda agents, baseline, and judge.

**Diagnosis distribution:**
- VADA_WON: 7
- BASELINE_WON: 7
- TIE / NEGLIGIBLE_DIFFERENCE / PIPELINE_FAILURE: 0 each

**Category breakdown:**
- Technical: 0/5 VADA_WON
- Business: 1/2 VADA_WON
- Ethical: 2/2 VADA_WON
- Personal: 3/3 VADA_WON
- Ambiguous: 1/2 VADA_WON (partial)

**Pipeline stability:** Zero parse failures, zero pipeline errors. The architecture runs reliably end-to-end.

See `vada-v1-bench-results.md` for full data and analysis.

### 4.2 What V1 Bench Confirms

- **Pipeline mechanics work.** 0 failures across 14 runs demonstrates the Mastra workflow, containment logic, and persistence are solid.
- **Deliberation adds clear value on ethical and personal questions.** 5/5 VADA_WON in these categories suggests genuine product value when questions have values tension or require reframing.
- **Cost economics are tractable.** ~$0.22 per full deliberation on Sonnet.

### 4.3 What V1 Bench Does Not Confirm

- Deliberation's value on analytical questions (Technical, Business strategy) is unclear — baseline wins 6/7 here.
- Architectural Cognitive Diversity — untested (V1 is single-model).
- Weak-to-strong generalization — untested at scale.
- The specific claim that "Cognitive Quarantine prevents consensus smoothing" — Quarantine works at agent level, but Synthesizer compression erases some benefits post-deliberation.

### 4.4 The Primary Finding

**The most important V1 bench finding is the Synthesizer over-compression problem (3.5 above).** V1's architecture produces deliberation content that is often better than single-shot, but the final compression step erases that advantage on decidable questions where baseline's longer, more conditional answer ends up more useful.

This is fixable. V2 Experiment 1.A targets it directly.

---

## Part 5: Weak-to-Strong Generalization (Hypothesis)

**Status: Untested at scale. Predictions in this section are not yet supported by V1 bench data.**

### 5.1 The Hypothesis

A weaker model will not produce the same quality of individual response as a strong model. But the round structure compensates. When Llama-as-Critic reads Llama-as-Strategist's output and finds a flaw, that flaw is real — even if Llama wouldn't have found it without the adversarial prompt forcing it to look.

The theory: structure does cognitive work the model alone cannot do. Multiple passes of a weaker model with structured feedback could exceed the performance of a single pass from a stronger model.

### 5.2 Predicted Quality Tiers

The quality gap likely shows up most clearly in the `unresolved_points` field. Strong models name subtle tensions. Weak models name obvious ones.

**V1 bench used Sonnet throughout.** Cross-model weak-to-strong testing is future work.

### 5.3 Optimization Rules for Weak Models (when used)

- Always use the Universal Anchor
- Use the Forgiving Audit (substring matching for PASS)
- Monitor tokens — weak models consume more per deliberation
- Keep Sonnet locked as Conclusion-Mode Synthesizer even in mixed-model tests

---

## Part 6: What We Actually Know

A strict accounting of what evidence supports, to distinguish theoretical claims from empirical ones.

### Well-supported (theory + implementation evidence)

- **Persona Collapse is real.** Demonstrated by small-model posture failures.
- **Cognitive Quarantine reduces prompt-level persona bleed.** Different models in different roles produce distinguishable outputs.
- **The three-round structure runs reliably.** Zero pipeline failures in V1 bench.
- **The Blind Critic catches parse failures.** Containment logic works as designed.
- **Universal Anchor reduces constraint drift.** Observed during development.
- **Model capability floor is real.** Qwen 14B cannot maintain postures reliably.

### Partially supported (evidence on some question types, not others)

- **Multi-round deliberation beats single-shot.** True on ethical and personal questions (5/5). Not true on technical or business (0-1/7). V2 experiments address the gap.

### Theoretical, not yet tested

- **Architectural Cognitive Diversity.** Theory suggests mixed models improve output; untested in V1.
- **Weak-to-strong generalization.** Predicted; not measured.
- **Structured deliberation approaches human group decision quality.** Unmeasurable in the usual sense, but bench vs single-shot is the best proxy we have and it's inconclusive so far.

### Disproven or weakened by V1 bench

- **"The Synthesizer will hallucinate consensus without structural safeguards."** Safeguards (schema + Blind Critic) prevent false consensus, but they do not prevent over-compression. Over-compression is a different failure mode that the architecture does not yet address.

---

## Part 7: The Research Agenda

Vāda is now operating as a research platform. The theoretical framework (Parts 1-3) provides hypotheses. V1 bench (Part 4) provides initial evidence. V2 experiments (documented in `vada-v2-specification.md`) will produce more.

### Core experiments

**Experiment 1.A — Synthesizer refinement.** Does preserving conditional structure in conclusions shift the BASELINE_WON cases?

**Experiment 1.B — Conclusion schema redesign.** If 1.A insufficient, does richer output structure help?

**Experiment 1.C — Iterative refinement.** Does a chat-pattern loop (agent answers, another reviews, first refines) outperform fixed-round architecture?

**Experiment 2.1 — Web search for agents.** Does tool access close the gap?

**Experiment 2.2 — Broader MCP tools.** Additional capability impact.

**Experiment 3 — Multi-model deliberation.** Does Architectural Cognitive Diversity in practice match the theoretical prediction?

Each measured against the same V1 bench questions.

---

## Closing

The theoretical case for multi-agent deliberation is strong — four independent frameworks (dialectic, hats, Belbin, red teaming) converge on similar structural requirements. Vāda implements those requirements.

The empirical case is partial. V1 demonstrates deliberation works on some question types, does not yet demonstrate it works on others. The architecture revealed a specific, addressable flaw (Synthesizer over-compression) that V2 experiments target.

Vāda is at the beginning of an evidence-building arc, not the end. The theory is the foundation. The experiments are the product.

---

**Vāda · The Science of Deliberation · Version 3 · April 2026**
*Theoretical foundations being validated by implementation.*
