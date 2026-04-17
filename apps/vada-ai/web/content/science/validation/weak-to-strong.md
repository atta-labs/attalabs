---
title: Weak-to-Strong Generalization
description: Can structured deliberation between cheap models approximate the quality of a single expensive model?
slug: /science/weak-to-strong
section: Validation
order: 2
---

# Weak-to-Strong Generalization

The hypothesis: structured multi-round deliberation between weak models can approximate — and in some cases exceed — the output quality of a single strong model thinking alone.

## The Mechanism

A weaker model (Llama 3 8B) will not produce the same quality of individual response as a strong model (Claude Sonnet). The vocabulary is less precise. The reasoning chains are shorter. The nuance is shallower.

But the round structure compensates.

When Llama-as-Critic reads Llama-as-Strategist's output and finds a flaw, that flaw is real — even if Llama wouldn't have found it without the adversarial prompt forcing it to look. The Critic's posture creates a cognitive stance the model would not adopt on its own. The structure does cognitive work the model alone cannot do.

This is the core claim: multiple passes of a weaker model with structured feedback loops can exceed the performance of a single pass from a stronger model — specifically when the task benefits from iteration rather than raw intelligence.

## Where It Works

Weak-to-strong generalization works best when:

- The task benefits from multiple perspectives (strategic decisions, risk assessment, ethical questions).
- The failure mode is consensus bias rather than factual error (the problem is not that the model doesn't know the answer — it's that the model doesn't challenge its first answer).
- The output is evaluated on structure and honesty rather than raw prose quality (the `unresolved_points` field matters more than the eloquence of the `recommendation`).

## Where It Breaks

Weak-to-strong generalization fails when:

- The task requires deep domain expertise that the weak model simply doesn't have. Structured debate cannot compensate for missing knowledge.
- The output requires precise schema compliance. Weak models are more likely to produce malformed JSON, miss fields, or handle escape sequences incorrectly.
- The deliberation requires more than three rounds. Weak models drift faster (even with the Universal Anchor), so extended deliberations degrade in quality.

## Predicted Quality Tiers

| Configuration | Predicted Quality vs. Single Sonnet |
|--------------|-------------------------------------|
| Sonnet Vāda (4 agents, 3 rounds) | Significantly better. The benchmark. |
| Llama 70B Vāda | 80-85% of Sonnet Vāda. Viable paid tier. |
| Llama 8B Vāda | 60-70% of Sonnet Vāda. May match single Sonnet. |
| Mixed models (Sonnet + GPT-4o + Gemini) | Potentially best. Real [architectural cognitive diversity](/science/cognitive-diversity). |

The quality gap shows up most clearly in the `unresolved_points` field. Strong models name subtle tensions — "The Strategist's timeline assumes regulatory approval by Q3, but the Critic noted that similar approvals in the EU have averaged 14 months." Weak models name obvious ones — "The agents disagreed about the timeline."

The `recommendation` may be similar in both cases. The honesty about uncertainty will differ.

## Optimization Rules for Weak Models

These rules were discovered through implementation and validated empirically:

**Always use the Universal Anchor.** Never remove the question parameter from `compose()`. Without it, weak models drift within 2 rounds. Strong models can sometimes survive without it. Weak models cannot.

**Use the Forgiving Audit.** The Blind Critic should look for `PASS` via substring match, not exact string equality. Weak models add conversational filler around their verdict.

**Monitor tokens per deliberation.** High-round deliberations with weak models consume 10,000-15,000 tokens per run. Budget accordingly. The cost advantage of weak models is partially offset by their verbosity.

**Lock the Synthesizer to Sonnet.** Even in mixed-model or all-weak configurations, keep Claude Sonnet for the Synthesizer in Conclusion Mode. Different providers handle JSON schema compliance differently. The Conclusion Protocol must be stable — a brilliant deliberation that produces malformed JSON is a failed product experience.

## The Business Implication

If weak-to-strong generalization holds, Vāda can offer a meaningful product at dramatically lower cost. A Llama 8B deliberation costs roughly 1/50th of a Sonnet deliberation. If it delivers 60-70% of the quality, that's a compelling free tier — especially for users who would otherwise make the decision with zero structured opposition.

The gap between "no deliberation" and "cheap deliberation" is far larger than the gap between "cheap deliberation" and "expensive deliberation."

---

*Next: [What We Proved](/science/what-we-proved) — empirical findings from the live prototype deliberation.*
