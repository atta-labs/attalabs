---
title: What We Proved
description: Empirical findings from the live three-way deliberation that designed Vāda itself.
slug: /science/what-we-proved
section: Validation
order: 3
---

# What We Proved

Vāda's architecture was not designed in isolation and then tested. It was designed *through* a live multi-model deliberation — Daniel (Principal), Claude Opus (Critic/Synthesizer), and Gemini Pro (Strategist/Operator) — that itself served as a manual prototype of the product.

The process generated its own data. Every architectural decision survived adversarial review from at least two independent models with different training distributions.

## Finding 1: Cognitive Quarantine Works

Two different models with the same input naturally diverged into different roles based on their architectures. Claude defaulted to structural skepticism — finding logical flaws, demanding precision, enforcing schema constraints. Gemini defaulted to generative system-building — proposing architectures, mapping ecosystems, building operational frameworks.

Neither was prompted to adopt these tendencies. The divergence emerged from their training distributions. This is the strongest evidence for [Architectural Cognitive Diversity](/science/cognitive-diversity) — different models genuinely think differently, and that difference is productive.

## Finding 2: The Round Structure Produces Natural Convergence

Both models independently concluded the deliberation was complete at the same time, without being told to stop. The signal was the absence of friction — when the Strategist stopped proposing new angles and the Critic stopped finding flaws, the deliberation had reached a natural terminal state.

This suggests that the three-round structure is not arbitrary. It maps to a natural rhythm of intellectual engagement: establish positions, collide, resolve.

## Finding 3: Compaction Between Rounds Kills the Product

An early design decision — inspired by standard AI agent best practices — was to compress prior round transcripts before passing them to the next round. The reasoning: reduce token count, save cost, prevent context overflow.

This was correctly identified as destructive. The specific language of disagreement is the data. When the Critic writes "Your assumption about European regulatory timelines is off by 18 months," those exact words are what the Devil's Advocate uses to build its Round 3 argument. Compacting that to "timeline concerns were raised" destroys the friction surface.

The rule is now absolute: raw transcript between adjacent rounds. No compaction, no summarization, no editorial cleanup. At four agents and approximately 500 words each, Round 1 produces roughly 3,000 tokens — well within context limits.

## Finding 4: The Blind Critic Catches Real Problems

The pattern of giving an auditor a clean context window — no deliberation history, no understanding of how the room arrived at its conclusion — forces evaluation of the output on its own merits.

In the prototype deliberation, the Blind Critic caught three classes of problems:

1. **Papering over disagreement.** The Synthesizer had produced a recommendation that sounded confident but quietly dropped an unresolved point that two agents could not reconcile. The Blind Critic, seeing only the recommendation and the original question, flagged the gap.

2. **Unsupported claims.** The recommendation referenced evidence that the Researcher had introduced in Round 2, but the conclusion didn't include enough context for the claim to stand alone. The Blind Critic asked: "Where does this number come from?"

3. **Format violations.** When the Principal requested "5 lines," the Synthesizer produced 7 lines of dense text. RULE 0 correctly identified the violation by counting `\n` characters.

## Finding 5: The Synthesizer Hallucinate Consensus Without Safeguards

Without structural enforcement, the Synthesizer defaults to producing comfortable, balanced summaries. It wants to resolve tension — that's what language models do. Left unconstrained, it will paper over genuine disagreement to produce a "clean" conclusion.

Two safeguards prevent this:

1. **Schema enforcement (Zod)** on the `unresolved_points` array. The field exists. It must be populated. If the Synthesizer leaves it empty when the transcript contains genuine disagreement, the schema provides no safety net — but the Blind Critic does.

2. **Blind Critic verification.** The auditor, seeing only the conclusion, is more likely to notice when the `unresolved_points` array is suspiciously empty or vague. It has no emotional investment in the deliberation's outcome.

This converts consensus hallucination from a prompt engineering problem to a systems design problem — which is the correct level to solve it.

## Finding 6: Architectural Cognitive Diversity Is Real

The most significant finding from the prototype: Claude and Gemini, given the same prompts and the same deliberation context, produced measurably different positions. Different blind spots. Different priorities. Different rhetorical patterns. Different instincts about what constitutes a "reasonable" position.

Claude was more likely to identify structural risks — flaws in the architecture, schema compliance concerns, logical inconsistencies. Gemini was more likely to identify strategic opportunities — ecosystem positioning, market timing, competitive framing.

The product benefits from that diversity. A full-Claude deliberation would be rigorous but potentially risk-averse. A full-Gemini deliberation would be expansive but potentially over-scoped. The combination produced conclusions that neither model would have reached alone.

This is the empirical foundation for the [BYOK direction](/science/cognitive-diversity) in V2.

---

*Next: [The Ecosystem](/science/ecosystem) — how Vāda connects to Vitakka and Attā.*
